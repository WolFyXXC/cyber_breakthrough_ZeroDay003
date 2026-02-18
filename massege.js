const { pool } = require('../database/postgres');
const { vectorDb } = require('../database/vectorDb');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const emotionService = require('../services/emotionService');
const relationshipService = require('../services/relationshipService');

class MessageController {
    /**
     * GET /api/chat/history
     * История сообщений
     */
    async getChatHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const before = req.query.before || new Date().toISOString();

            const messages = await pool.query(
                `SELECT 
                    m.id, m.character_id, m.content, 
                    m.emotion_context, m.created_at,
                    c.name, c.avatar_url
                 FROM messages m
                 JOIN characters c ON c.id = m.character_id
                 WHERE m.created_at < $1
                 ORDER BY m.created_at DESC
                 LIMIT $2`,
                [before, limit]
            );

            res.json({
                count: messages.rows.length,
                messages: messages.rows.reverse(),
                has_more: messages.rows.length === limit
            });

        } catch (error) {
            logger.error('Ошибка в getChatHistory:', error);
            res.status(500).json({ error: 'Не удалось получить историю чата' });
        }
    }

    /**
     * Получение последних сообщений для WebSocket
     */
    async getRecentMessages(roomId, limit = 20) {
        try {
            const messages = await pool.query(
                `SELECT 
                    m.id, m.character_id, m.content, 
                    m.emotion_context, m.created_at,
                    c.name, c.avatar_url
                 FROM messages m
                 JOIN characters c ON c.id = m.character_id
                 WHERE m.room_id = $1
                 ORDER BY m.created_at DESC
                 LIMIT $2`,
                [roomId, limit]
            );

            return messages.rows.reverse();
        } catch (error) {
            logger.error('Ошибка в getRecentMessages:', error);
            return [];
        }
    }

    /**
     * Обработка сообщения от пользователя (для WebSocket)
     */
    async processUserMessage(characterId, userMessage) {
        try {
            // 1. Сохраняем сообщение пользователя
            const userMessageId = uuidv4();
            await pool.query(
                `INSERT INTO messages (id, character_id, content, emotion_context, room_id, is_user)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userMessageId, characterId, userMessage, '{}', 'main-hall', true]
            );

            // 2. Отправляем запрос к AI-агенту (отдельный сервис)
            const agentResponse = await this.callAgentService(characterId, userMessage);
            
            // 3. Сохраняем ответ агента
            const responseId = uuidv4();
            await pool.query(
                `INSERT INTO messages (id, character_id, content, emotion_context, room_id, is_user)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [responseId, characterId, agentResponse.text, agentResponse.emotion, 'main-hall', false]
            );

            // 4. Обновляем эмоции персонажа
            await emotionService.updateMood(characterId, agentResponse.emotion);

            // 5. Сохраняем в векторную память
            await this.saveToVectorMemory(characterId, userMessage, agentResponse);

            return {
                id: responseId,
                character_id: characterId,
                content: agentResponse.text,
                emotion: agentResponse.emotion.mood,
                created_at: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Ошибка в processUserMessage:', error);
            throw error;
        }
    }

    /**
     * Вызов сервиса AI-агентов
     */
    async callAgentService(characterId, message) {
        // Здесь будет вызов вашего отдельного сервиса с AI-агентами
        // Пока возвращаем заглушку
        return {
            text: "Привет! Я получил твое сообщение. Как дела?",
            emotion: {
                mood: 'happy',
                intensity: 0.7,
                valence: 'positive'
            }
        };
    }

    /**
     * Сохранение в векторную память
     */
    async saveToVectorMemory(characterId, userMessage, agentResponse) {
        try {
            const collection = await vectorDb.getOrCreateCollection({
                name: `character_${characterId}_memories`
            });

            await collection.add({
                ids: [uuidv4()],
                documents: [`Пользователь: ${userMessage} | Я ответил: ${agentResponse.text}`],
                metadatas: [{
                    type: 'conversation',
                    timestamp: new Date().toISOString(),
                    emotion: agentResponse.emotion.mood
                }]
            });

        } catch (error) {
            logger.warn('Не удалось сохранить в векторную память:', error);
        }
    }

    /**
     * POST /api/intervene/message
     * Отправка сообщения от пользователя (REST версия)
     */
    async sendUserMessage(req, res) {
        try {
            const { target_character_id, message } = req.body;

            if (!target_character_id || !message) {
                return res.status(400).json({ 
                    error: 'Не указан персонаж или сообщение' 
                });
            }

            // Проверяем существование персонажа
            const character = await pool.query(
                'SELECT id, name FROM characters WHERE id = $1',
                [target_character_id]
            );

            if (character.rows.length === 0) {
                return res.status(404).json({ error: 'Персонаж не найден' });
            }

            // Обрабатываем сообщение
            const response = await this.processUserMessage(target_character_id, message);

            // Отправляем через WebSocket всем клиентам
            const io = req.app.get('io');
            io.to('main-hall').emit('new_message', response);

            res.json({
                success: true,
                message: 'Сообщение отправлено',
                response: response
            });

        } catch (error) {
            logger.error('Ошибка в sendUserMessage:', error);
            res.status(500).json({ error: 'Не удалось отправить сообщение' });
        }
    }

    /**
     * GET /api/search/messages?q=
     * Поиск сообщений через векторную БД
     */
    async searchMessages(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 3) {
                return res.json({ messages: [] });
            }

            // Ищем во всех коллекциях персонажей
            const collections = await vectorDb.listCollections();
            const results = [];

            for (const collectionName of collections) {
                if (collectionName.startsWith('character_')) {
                    const collection = await vectorDb.getCollection({ name: collectionName });
                    
                    const queryResults = await collection.query({
                        queryTexts: [q],
                        nResults: 5
                    });

                    if (queryResults.documents[0]?.length > 0) {
                        const characterId = collectionName.replace('character_', '').replace('_memories', '');
                        
                        // Получаем имя персонажа
                        const character = await pool.query(
                            'SELECT name FROM characters WHERE id = $1',
                            [characterId]
                        );

                        results.push({
                            character_id: characterId,
                            character_name: character.rows[0]?.name || 'Unknown',
                            memories: queryResults.documents[0].map((doc, idx) => ({
                                text: doc,
                                score: queryResults.distances[0]?.[idx] || 0,
                                metadata: queryResults.metadatas[0]?.[idx]
                            }))
                        });
                    }
                }
            }

            res.json({
                query: q,
                results: results
            });

        } catch (error) {
            logger.error('Ошибка в searchMessages:', error);
            res.status(500).json({ error: 'Ошибка поиска' });
        }
    }
}

module.exports = new MessageController();
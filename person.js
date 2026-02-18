const { pool } = require('../database/postgres');
const { vectorDb } = require('../database/vectorDb');
const logger = require('../utils/logger');

class CharacterController {
    /**
     * GET /api/characters
     * Список всех персонажей
     */
    async getAllCharacters(req, res) {
        try {
            const characters = await pool.query(
                `SELECT 
                    id, name, avatar_url, 
                    current_mood, mood_value,
                    background_story,
                    created_at
                FROM characters
                ORDER BY name`
            );

            res.json({
                count: characters.rows.length,
                characters: characters.rows
            });

        } catch (error) {
            logger.error('Ошибка в getAllCharacters:', error);
            res.status(500).json({ error: 'Не удалось получить список персонажей' });
        }
    }

    /**
     * GET /api/characters/:id
     * Детальная информация о персонаже
     */
    async getCharacterById(req, res) {
        try {
            const { id } = req.params;

            // Основная информация
            const character = await pool.query(
                `SELECT * FROM characters WHERE id = $1`,
                [id]
            );

            if (character.rows.length === 0) {
                return res.status(404).json({ error: 'Персонаж не найден' });
            }

            // Последние сообщения
            const recentMessages = await pool.query(
                `SELECT content, emotion_context, created_at
                 FROM messages
                 WHERE character_id = $1
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [id]
            );

            // Топ отношений
            const topRelations = await pool.query(
                `SELECT 
                    c2.id, c2.name, c2.avatar_url,
                    r.relationship_type, r.strength,
                    r.memory_summary
                 FROM relationships r
                 JOIN characters c2 ON c2.id = r.related_character_id
                 WHERE r.character_id = $1
                 ORDER BY ABS(r.strength) DESC
                 LIMIT 5`,
                [id]
            );

            const characterData = character.rows[0];
            characterData.recent_messages = recentMessages.rows;
            characterData.top_relationships = topRelations.rows;

            res.json(characterData);

        } catch (error) {
            logger.error('Ошибка в getCharacterById:', error);
            res.status(500).json({ error: 'Не удалось получить данные персонажа' });
        }
    }

    /**
     * GET /api/characters/:id/history
     * Полная история персонажа
     */
    async getCharacterHistory(req, res) {
        try {
            const { id } = req.params;

            // 1. Базовая информация
            const character = await pool.query(
                'SELECT * FROM characters WHERE id = $1',
                [id]
            );

            if (character.rows.length === 0) {
                return res.status(404).json({ error: 'Персонаж не найден' });
            }

            // 2. Все сообщения персонажа
            const messages = await pool.query(
                `SELECT content, emotion_context, created_at
                 FROM messages
                 WHERE character_id = $1
                 ORDER BY created_at DESC`,
                [id]
            );

            // 3. Все отношения
            const relationships = await pool.query(
                `SELECT 
                    c2.name as character_name,
                    r.relationship_type,
                    r.strength,
                    r.memory_summary,
                    r.last_interaction
                 FROM relationships r
                 JOIN characters c2 ON c2.id = r.related_character_id
                 WHERE r.character_id = $1
                 ORDER BY r.strength DESC`,
                [id]
            );

            // 4. События из временной шкалы
            const events = await pool.query(
                `SELECT event_type, description, created_at
                 FROM character_events
                 WHERE character_id = $1
                 ORDER BY created_at DESC
                 LIMIT 100`,
                [id]
            );

            // 5. Важные воспоминания из векторной БД
            let memories = [];
            try {
                const collection = await vectorDb.getOrCreateCollection({
                    name: `character_${id}_memories`
                });
                
                const results = await collection.query({
                    queryTexts: ["важные события"],
                    nResults: 10
                });
                
                memories = results.documents[0] || [];
            } catch (vectorError) {
                logger.warn('Не удалось получить векторные воспоминания:', vectorError);
            }

            // Формируем полную историю
            const history = {
                character: character.rows[0],
                summary: {
                    total_messages: messages.rows.length,
                    total_relationships: relationships.rows.length,
                    total_events: events.rows.length,
                    first_seen: events.rows[events.rows.length - 1]?.created_at || character.rows[0].created_at,
                    last_active: messages.rows[0]?.created_at || character.rows[0].last_active
                },
                timeline: this.buildTimeline(events.rows, messages.rows),
                messages: messages.rows.slice(0, 50), // последние 50
                relationships: relationships.rows,
                important_memories: memories,
                emotional_journey: await this.getEmotionalJourney(id)
            };

            res.json(history);

        } catch (error) {
            logger.error('Ошибка в getCharacterHistory:', error);
            res.status(500).json({ error: 'Не удалось получить историю персонажа' });
        }
    }

    /**
     * Вспомогательный метод: строит временную шкалу
     */
    buildTimeline(events, messages) {
        const timeline = [];
        
        // Добавляем события
        events.forEach(event => {
            timeline.push({
                type: 'event',
                data: event,
                timestamp: event.created_at
            });
        });

        // Добавляем важные сообщения (каждое 10-е для примера)
        messages.forEach((msg, index) => {
            if (index % 10 === 0) {
                timeline.push({
                    type: 'milestone_message',
                    data: msg,
                    timestamp: msg.created_at
                });
            }
        });

        // Сортируем по времени
        return timeline.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }

    /**
     * Вспомогательный метод: эмоциональный путь персонажа
     */
    async getEmotionalJourney(characterId) {
        const moodHistory = await pool.query(
            `SELECT mood_value, created_at
             FROM mood_history
             WHERE character_id = $1
             ORDER BY created_at DESC
             LIMIT 100`,
            [characterId]
        );

        return {
            current: moodHistory.rows[0]?.mood_value || 0,
            history: moodHistory.rows.reverse(),
            average: moodHistory.rows.reduce((acc, row) => acc + row.mood_value, 0) / moodHistory.rows.length || 0
        };
    }

    /**
     * GET /api/characters/:id/relationships
     * Граф отношений персонажа
     */
    async getCharacterRelationships(req, res) {
        try {
            const { id } = req.params;

            const relationships = await pool.query(
                `SELECT 
                    c2.id as target_id,
                    c2.name as target_name,
                    c2.avatar_url,
                    r.relationship_type,
                    r.strength,
                    r.memory_summary,
                    (
                        SELECT COUNT(*) 
                        FROM messages 
                        WHERE (character_id = $1 AND related_character_id = c2.id)
                        OR (character_id = c2.id AND related_character_id = $1)
                    ) as interaction_count
                 FROM relationships r
                 JOIN characters c2 ON c2.id = r.related_character_id
                 WHERE r.character_id = $1
                 ORDER BY ABS(r.strength) DESC`,
                [id]
            );

            // Формируем данные для графа
            const graphData = {
                nodes: [
                    { id: id, name: 'Вы', group: 'self' },
                    ...relationships.rows.map(r => ({
                        id: r.target_id,
                        name: r.target_name,
                        group: r.relationship_type,
                        strength: r.strength
                    }))
                ],
                links: relationships.rows.map(r => ({
                    source: id,
                    target: r.target_id,
                    value: Math.abs(r.strength),
                    type: r.relationship_type
                }))
            };

            res.json({
                relationships: relationships.rows,
                graph: graphData
            });

        } catch (error) {
            logger.error('Ошибка в getCharacterRelationships:', error);
            res.status(500).json({ error: 'Не удалось получить отношения' });
        }
    }

    /**
     * GET /api/search/characters?q=
     * Поиск персонажей
     */
    async searchCharacters(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.length < 2) {
                return res.json({ characters: [] });
            }

            const results = await pool.query(
                `SELECT id, name, avatar_url, current_mood, background_story
                 FROM characters
                 WHERE name ILIKE $1
                 OR background_story ILIKE $1
                 LIMIT 20`,
                [`%${q}%`]
            );

            res.json({
                query: q,
                count: results.rows.length,
                characters: results.rows
            });

        } catch (error) {
            logger.error('Ошибка в searchCharacters:', error);
            res.status(500).json({ error: 'Ошибка поиска' });
        }
    }
}

module.exports = new CharacterController();
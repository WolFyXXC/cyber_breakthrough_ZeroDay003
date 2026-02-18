const { pool } = require('../database/postgres');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const emotionService = require('../services/emotionService');

class InterveneController {
    /**
     * POST /api/intervene/command
     * Отправка команды для изменения мира
     */
    async sendWorldCommand(req, res) {
        try {
            const { command, value } = req.body;

            // Список доступных команд
            const validCommands = ['change_weather', 'set_time', 'announcement'];

            if (!validCommands.includes(command)) {
                return res.status(400).json({ 
                    error: 'Неизвестная команда',
                    available: validCommands 
                });
            }

            let response = { success: true, command, value };
            const io = req.app.get('io');

            // Обрабатываем разные команды
            switch(command) {
                case 'change_weather':
                    // Меняем погоду - влияет на настроение всех персонажей
                    await this.changeWeather(value, io);
                    response.message = `Погода изменена на ${value}`;
                    break;

                case 'set_time':
                    // Меняем время суток
                    await this.setTime(value, io);
                    response.message = `Время установлено: ${value}`;
                    break;

                case 'announcement':
                    // Делаем объявление всем персонажам
                    await this.makeAnnouncement(value, io);
                    response.message = `Объявление: ${value}`;
                    break;
            }

            res.json(response);

        } catch (error) {
            logger.error('Ошибка в sendWorldCommand:', error);
            res.status(500).json({ error: 'Не удалось выполнить команду' });
        }
    }

    /**
     * Изменение погоды
     */
    async changeWeather(weather, io) {
        // Сохраняем новую погоду
        await pool.query(
            `INSERT INTO world_state (key, value, updated_at)
             VALUES ('weather', $1, NOW())
             ON CONFLICT (key) DO UPDATE 
             SET value = $1, updated_at = NOW()`,
            [weather]
        );

        // Влияем на настроение персонажей
        const moodEffect = this.getWeatherMoodEffect(weather);
        
        const characters = await pool.query(
            'SELECT id FROM characters WHERE status = \'online\''
        );

        for (const char of characters.rows) {
            await emotionService.applyExternalEffect(char.id, moodEffect);
        }

        // Оповещаем всех
        io.to('main-hall').emit('world_update', {
            type: 'weather_change',
            value: weather,
            mood_effect: moodEffect
        });
    }

    /**
     * Эффект погоды на настроение
     */
    getWeatherMoodEffect(weather) {
        const effects = {
            'sunny': { mood: +0.2, reason: 'солнечная погода' },
            'rainy': { mood: -0.1, reason: 'идёт дождь' },
            'storm': { mood: -0.3, reason: 'гроза' },
            'snow': { mood: +0.1, reason: 'снегопад' }
        };
        return effects[weather] || { mood: 0, reason: 'обычная погода' };
    }

    /**
     * Установка времени
     */
    async setTime(timeOfDay, io) {
        await pool.query(
            `INSERT INTO world_state (key, value, updated_at)
             VALUES ('time_of_day', $1, NOW())
             ON CONFLICT (key) DO UPDATE 
             SET value = $1, updated_at = NOW()`,
            [timeOfDay]
        );

        io.to('main-hall').emit('world_update', {
            type: 'time_change',
            value: timeOfDay
        });
    }

    /**
     * Сделать объявление
     */
    async makeAnnouncement(text, io) {
        // Сохраняем объявление в системные сообщения
        const announcementId = uuidv4();
        await pool.query(
            `INSERT INTO messages (id, character_id, content, is_system, room_id)
             VALUES ($1, NULL, $2, true, 'main-hall')`,
            [announcementId, text]
        );

        io.to('main-hall').emit('system_message', {
            id: announcementId,
            content: text,
            type: 'announcement'
        });
    }

    /**
     * POST /api/intervene/spawn
     * Создание нового персонажа
     */
    async spawnCharacter(req, res) {
        try {
            const { name, personality, background } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Имя обязательно' });
            }

            const characterId = uuidv4();

            // Базовая личность по умолчанию
            const defaultPersonality = {
                openness: 0.5,
                conscientiousness: 0.5,
                extraversion: 0.5,
                agreeableness: 0.5,
                neuroticism: 0.5
            };

            // Создаем персонажа
            await pool.query(
                `INSERT INTO characters (
                    id, name, personality_traits, background_story,
                    current_mood, mood_value, status, current_room,
                    avatar_url, created_at, last_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
                [
                    characterId,
                    name,
                    JSON.stringify(personality || defaultPersonality),
                    background || 'Новый персонаж в виртуальном мире',
                    'neutral',
                    0,
                    'online',
                    'main-hall',
                    `/avatars/default-${Math.floor(Math.random() * 5) + 1}.png`
                ]
            );

            // Создаем приветственное событие
            await pool.query(
                `INSERT INTO character_events (id, character_id, event_type, description, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [uuidv4(), characterId, 'spawn', `${name} появился в мире`]
            );

            // Получаем созданного персонажа
            const newCharacter = await pool.query(
                'SELECT * FROM characters WHERE id = $1',
                [characterId]
            );

            // Оповещаем всех о новом персонаже
            const io = req.app.get('io');
            io.to('main-hall').emit('character_spawned', newCharacter.rows[0]);

            res.json({
                success: true,
                message: 'Персонаж создан',
                character: newCharacter.rows[0]
            });

        } catch (error) {
            logger.error('Ошибка в spawnCharacter:', error);
            res.status(500).json({ error: 'Не удалось создать персонажа' });
        }
    }
}

module.exports = new InterveneController();
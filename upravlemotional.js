const { pool } = require('../database/postgres');
const logger = require('../utils/logger');

class EmotionService {
    /**
     * Обновление настроения персонажа
     */
    async updateMood(characterId, emotionData) {
        try {
            const { mood, intensity, valence } = emotionData;
            
            // Преобразуем эмоцию в числовое значение
            const moodValue = this.emotionToValue(mood, intensity, valence);
            
            // Получаем текущее настроение
            const current = await pool.query(
                'SELECT mood_value FROM characters WHERE id = $1',
                [characterId]
            );

            if (current.rows.length === 0) return;

            // Плавно изменяем настроение (20% от целевого)
            const currentValue = current.rows[0].mood_value;
            const newValue = currentValue * 0.8 + moodValue * 0.2;

            // Обновляем в базе
            await pool.query(
                `UPDATE characters 
                 SET current_mood = $1, mood_value = $2, last_active = NOW()
                 WHERE id = $3`,
                [mood, newValue, characterId]
            );

            // Сохраняем в историю
            await pool.query(
                `INSERT INTO mood_history (character_id, mood_value, reason)
                 VALUES ($1, $2, $3)`,
                [characterId, newValue, `эмоция: ${mood}`]
            );

            logger.info(`😊 Настроение ${characterId} изменено на ${mood} (${newValue})`);

        } catch (error) {
            logger.error('Ошибка обновления настроения:', error);
        }
    }

    /**
     * Применение внешнего эффекта (погода, события)
     */
    async applyExternalEffect(characterId, effect) {
        try {
            const { mood: moodDelta, reason } = effect;

            // Получаем текущее настроение
            const current = await pool.query(
                'SELECT mood_value FROM characters WHERE id = $1',
                [characterId]
            );

            if (current.rows.length === 0) return;

            const currentValue = current.rows[0].mood_value;
            
            // Ограничиваем значение от -1 до 1
            const newValue = Math.max(-1, Math.min(1, currentValue + moodDelta));

            // Определяем текстовое настроение по значению
            const moodText = this.valueToMood(newValue);

            // Обновляем
            await pool.query(
                `UPDATE characters 
                 SET current_mood = $1, mood_value = $2
                 WHERE id = $3`,
                [moodText, newValue, characterId]
            );

            await pool.query(
                `INSERT INTO mood_history (character_id, mood_value, reason)
                 VALUES ($1, $2, $3)`,
                [characterId, newValue, reason]
            );

        } catch (error) {
            logger.error('Ошибка применения эффекта:', error);
        }
    }

    /**
     * Конвертация эмоции в число
     */
    emotionToValue(mood, intensity = 0.5, valence = 'neutral') {
        const moodBase = {
            'happy': 0.5,
            'excited': 0.8,
            'content': 0.3,
            'neutral': 0,
            'sad': -0.4,
            'angry': -0.6,
            'scared': -0.5,
            'surprised': 0.2,
            'disgusted': -0.3
        };

        let value = moodBase[mood] || 0;
        
        // Учитываем интенсивность
        value *= intensity;
        
        // Учитываем валентность
        if (valence === 'positive') value = Math.abs(value);
        else if (valence === 'negative') value = -Math.abs(value);

        return Math.max(-1, Math.min(1, value));
    }

    /**
     * Конвертация числа в текстовое настроение
     */
    valueToMood(value) {
        if (value > 0.6) return 'excited';
        if (value > 0.3) return 'happy';
        if (value > 0.1) return 'content';
        if (value > -0.1) return 'neutral';
        if (value > -0.4) return 'sad';
        if (value > -0.7) return 'angry';
        return 'miserable';
    }
}

module.exports = new EmotionService();
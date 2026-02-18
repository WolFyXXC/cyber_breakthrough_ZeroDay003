const { Pool } = require('pg');
const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger');

// PostgreSQL подключение
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // максимум 20 подключений
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Векторная БД
const vectorDb = new ChromaClient({
    path: process.env.VECTOR_DB_PATH
});

// Проверка подключения к PostgreSQL
const connectPostgres = async () => {
    try {
        const client = await pool.connect();
        logger.info('Тестовое подключение к PostgreSQL успешно');
        
        // Создаем таблицы, если их нет
        await createTables(client);
        
        client.release();
        return true;
    } catch (error) {
        logger.error('Ошибка подключения к PostgreSQL:', error);
        throw error;
    }
};

// Создание таблиц
const createTables = async (client) => {
    try {
        // Таблица персонажей
        await client.query(`
            CREATE TABLE IF NOT EXISTS characters (
                id UUID PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                avatar_url TEXT,
                personality_traits JSONB,
                background_story TEXT,
                current_mood VARCHAR(50) DEFAULT 'neutral',
                mood_value FLOAT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'offline',
                current_room VARCHAR(50) DEFAULT 'main-hall',
                created_at TIMESTAMP DEFAULT NOW(),
                last_active TIMESTAMP DEFAULT NOW()
            )
        `);

        // Таблица сообщений
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY,
                character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
                content TEXT NOT NULL,
                emotion_context JSONB,
                is_user BOOLEAN DEFAULT false,
                is_system BOOLEAN DEFAULT false,
                room_id VARCHAR(50) DEFAULT 'main-hall',
                related_character_id UUID,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Таблица отношений
        await client.query(`
            CREATE TABLE IF NOT EXISTS relationships (
                id UUID PRIMARY KEY,
                character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
                related_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
                relationship_type VARCHAR(20),
                strength FLOAT DEFAULT 0,
                memory_summary TEXT,
                last_interaction TIMESTAMP DEFAULT NOW(),
                UNIQUE(character_id, related_character_id)
            )
        `);

        // Таблица событий
        await client.query(`
            CREATE TABLE IF NOT EXISTS character_events (
                id UUID PRIMARY KEY,
                character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
                event_type VARCHAR(50),
                description TEXT,
                related_character_id UUID,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Таблица истории настроения
        await client.query(`
            CREATE TABLE IF NOT EXISTS mood_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
                mood_value FLOAT,
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Таблица состояния мира
        await client.query(`
            CREATE TABLE IF NOT EXISTS world_state (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Индексы для быстрого поиска
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_character ON messages(character_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
            CREATE INDEX IF NOT EXISTS idx_events_character ON character_events(character_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_mood_history_character ON mood_history(character_id, created_at DESC);
        `);

        logger.info('✅ Таблицы созданы/проверены');
    } catch (error) {
        logger.error('Ошибка создания таблиц:', error);
        throw error;
    }
};

// Подключение к векторной БД
const connectVectorDB = async () => {
    try {
        await vectorDb.heartbeat();
        logger.info('✅ Векторная БД доступна');
        return true;
    } catch (error) {
        logger.error('❌ Векторная БД недоступна:', error);
        throw error;
    }
};

module.exports = {
    pool,
    vectorDb,
    connectPostgres,
    connectVectorDB
};
// Главный входной файл приложения
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const setupWebSocket = require('./src/routes/websocket');
const { connectPostgres, connectVectorDB } = require('./src/database/postgres');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Создаем HTTP сервер
const server = http.createServer(app);

// Подключаем WebSocket
const io = setupWebSocket(server);

// Сохраняем io в app для использования в контроллерах
app.set('io', io);

// Подключаемся к базам данных
async function startServer() {
    try {
        // Подключение к PostgreSQL
        await connectPostgres();
        logger.info('✅ PostgreSQL подключен');
        
        // Подключение к векторной БД
        await connectVectorDB();
        logger.info('✅ Векторная БД подключена');
        
        // Запускаем сервер
        server.listen(PORT, () => {
            logger.info(`🚀 Сервер запущен на порту ${PORT}`);
            logger.info(`📡 REST API: http://localhost:${PORT}/api`);
            logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

startServer();

// Корректное завершение
process.on('SIGINT', async () => {
    logger.info('🛑 Завершение работы...');
    process.exit(0);
});
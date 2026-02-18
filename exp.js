const express = require('express');
const cors = require('cors');
const routes = require('./routes/api');
const logger = require('./utils/logger');

const app = express();

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    logger.info(`📨 ${req.method} ${req.url}`);
    next();
});

// Разрешаем кросс-доменные запросы (для фронтенда)
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // адреса фронтенда
    credentials: true
}));

// Парсим JSON в запросах
app.use(express.json());

// Все API маршруты начинаются с /api
app.use('/api', routes);

// Обработка ошибок
app.use((err, req, res, next) => {
    logger.error('❌ Ошибка:', err.message);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: err.message
    });
});

// 404 - маршрут не найден
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

module.exports = app;
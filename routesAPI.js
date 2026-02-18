const express = require('express');
const router = express.Router();

// Подключаем контроллеры
const characterController = require('../controllers/characterController');
const roomController = require('../controllers/roomController');
const messageController = require('../controllers/messageController');
const interveneController = require('../controllers/interveneController');

// ========== МАРШРУТЫ ДЛЯ КОМНАТЫ ==========
/**
 * GET /api/room/current
 * Возвращает: текущую комнату, персонажей в ней и последние сообщения
 */
router.get('/room/current', roomController.getCurrentRoom);

/**
 * GET /api/room/stats
 * Возвращает: статистику комнаты (сколько персонажей онлайн, всего сообщений)
 */
router.get('/room/stats', roomController.getRoomStats);

// ========== МАРШРУТЫ ДЛЯ ПЕРСОНАЖЕЙ ==========
/**
 * GET /api/characters
 * Возвращает: список всех персонажей (кратко)
 */
router.get('/characters', characterController.getAllCharacters);

/**
 * GET /api/characters/:id
 * Возвращает: детальную информацию о конкретном персонаже
 */
router.get('/characters/:id', characterController.getCharacterById);

/**
 * GET /api/characters/:id/history
 * Возвращает: полную историю персонажа (события, сообщения, отношения)
 */
router.get('/characters/:id/history', characterController.getCharacterHistory);

/**
 * GET /api/characters/:id/timeline
 * Возвращает: временную шкалу событий персонажа
 */
router.get('/characters/:id/timeline', characterController.getCharacterTimeline);

/**
 * GET /api/characters/:id/relationships
 * Возвращает: граф отношений персонажа с другими
 */
router.get('/characters/:id/relationships', characterController.getCharacterRelationships);

/**
 * GET /api/characters/:id/memories
 * Возвращает: важные воспоминания персонажа из векторной БД
 */
router.get('/characters/:id/memories', characterController.getCharacterMemories);

// ========== МАРШРУТЫ ДЛЯ СООБЩЕНИЙ ==========
/**
 * GET /api/chat/history
 * Query params: ?limit=50&before=timestamp
 * Возвращает: историю сообщений в чате
 */
router.get('/chat/history', messageController.getChatHistory);

/**
 * GET /api/chat/messages/:messageId
 * Возвращает: конкретное сообщение и контекст вокруг него
 */
router.get('/chat/messages/:messageId', messageController.getMessageById);

// ========== МАРШРУТЫ ДЛЯ ВМЕШАТЕЛЬСТВА ПОЛЬЗОВАТЕЛЯ ==========
/**
 * POST /api/intervene/message
 * Тело запроса: { target_character_id: "uuid", message: "текст" }
 * Отправляет сообщение от пользователя конкретному персонажу
 */
router.post('/intervene/message', interveneController.sendUserMessage);

/**
 * POST /api/intervene/command
 * Тело запроса: { command: "change_weather", value: "rainy" }
 * Отправляет команду для изменения мира
 */
router.post('/intervene/command', interveneController.sendWorldCommand);

/**
 * POST /api/intervene/spawn
 * Тело запроса: { name: "Новый персонаж", personality: {...} }
 * Создает нового персонажа в мире
 */
router.post('/intervene/spawn', interveneController.spawnCharacter);

// ========== МАРШРУТЫ ДЛЯ ПОИСКА ==========
/**
 * GET /api/search/characters?q=имя
 * Поиск персонажей по имени
 */
router.get('/search/characters', characterController.searchCharacters);

/**
 * GET /api/search/messages?q=текст
 * Поиск сообщений по тексту (через векторную БД)
 */
router.get('/search/messages', messageController.searchMessages);

module.exports = router;
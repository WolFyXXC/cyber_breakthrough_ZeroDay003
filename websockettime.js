const { Server } = require('socket.io');
const logger = require('../utils/logger');
const messageController = require('../controllers/messageController');

function setupWebSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST']
        }
    });

    // Храним подключенных пользователей
    const connectedUsers = new Map();

    io.on('connection', (socket) => {
        logger.info(`🔌 Новое WebSocket подключение: ${socket.id}`);

        // Клиент подписывается на комнату
        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            logger.info(`📌 Клиент ${socket.id} присоединился к комнате ${roomId}`);
            
            // Отправляем историю комнаты новому клиенту
            messageController.getRecentMessages(roomId, 20).then(messages => {
                socket.emit('room_history', messages);
            });
        });

        // Клиент покидает комнату
        socket.on('leave_room', (roomId) => {
            socket.leave(roomId);
            logger.info(`🚪 Клиент ${socket.id} покинул комнату ${roomId}`);
        });

        // Получение сообщения от пользователя
        socket.on('user_message', async (data) => {
            try {
                const { characterId, message } = data;
                
                // Отправляем сообщение агенту и получаем ответ
                const response = await messageController.processUserMessage(characterId, message);
                
                // Отправляем ответ всем в комнате
                io.to('main-hall').emit('new_message', response);
                
                // Обновляем эмоции персонажа
                io.to('main-hall').emit('mood_update', {
                    characterId: response.character_id,
                    newMood: response.emotion,
                    reason: 'ответил на сообщение'
                });
                
            } catch (error) {
                logger.error('Ошибка обработки сообщения:', error);
                socket.emit('error', { message: 'Не удалось обработать сообщение' });
            }
        });

        // Запрос детальной информации о персонаже
        socket.on('get_character_details', async (characterId) => {
            try {
                const character = await characterController.getCharacterById(characterId);
                socket.emit('character_details', character);
            } catch (error) {
                socket.emit('error', { message: 'Персонаж не найден' });
            }
        });

        // Отключение клиента
        socket.on('disconnect', () => {
            logger.info(`❌ Отключение: ${socket.id}`);
            connectedUsers.delete(socket.id);
        });
    });

    return io;
}

module.exports = setupWebSocket;
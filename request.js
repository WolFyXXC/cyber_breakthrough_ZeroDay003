// controllers/characterController.js
const getCharacterHistory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Получаем основную информацию о персонаже
        const character = await db.query(
            'SELECT * FROM characters WHERE id = $1',
            [id]
        );
        
        // 2. Получаем временную шкалу событий
        const timeline = await db.query(
            `SELECT * FROM character_events 
             WHERE character_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [id]
        );
        
        // 3. Получаем отношения с другими персонажами
        const relationships = await db.query(
            `SELECT c2.name, r.* 
             FROM relationships r
             JOIN characters c2 ON c2.id = r.character2_id
             WHERE r.character1_id = $1`,
            [id]
        );
        
        // 4. Ищем важные воспоминания в векторной БД
        const importantMemories = await vectorDB.search(
            `важные события из жизни ${character.name}`,
            5
        );
        
        res.json({
            character: character[0],
            timeline: timeline.rows,
            relationships: relationships.rows,
            memories: importantMemories
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// controllers/roomController.js
const getCurrentRoom = async (req, res) => {
    // Получаем всех активных персонажей в комнате
    const activeCharacters = await db.query(
        `SELECT id, name, avatar_url, current_mood, mood_value
         FROM characters 
         WHERE status = 'online' 
         AND current_room = 'main-hall'`
    );
    
    // Получаем последние 20 сообщений
    const recentMessages = await db.query(
        `SELECT m.*, c.name, c.avatar_url
         FROM messages m
         JOIN characters c ON c.id = m.character_id
         WHERE m.room_id = 'main-hall'
         ORDER BY m.created_at DESC
         LIMIT 20`
    );
    
    res.json({
        room: {
            id: 'main-hall',
            name: 'Главный зал',
            characters: activeCharacters.rows,
            recent_messages: recentMessages.rows.reverse()
        }
    });
};
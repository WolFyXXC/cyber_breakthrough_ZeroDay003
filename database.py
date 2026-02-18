#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Модуль для работы с базой данных виртуального мира.
Использует SQLite - не требует установки PostgreSQL.
"""

import sqlite3
import json
import uuid
from datetime import datetime
import os

# Имя файла базы данных
DB_NAME = 'virtual_world.db'

# =========================================
# ПОДКЛЮЧЕНИЕ К БАЗЕ
# =========================================

def get_connection():
    """
    Создает подключение к SQLite базе данных.
    Возвращает connection и cursor.
    """
    conn = sqlite3.connect(DB_NAME)
    # Включаем поддержку внешних ключей
    conn.execute("PRAGMA foreign_keys = ON")
    # Возвращаем строки как словари
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """
    Инициализирует базу данных: создает все таблицы, если их нет.
    Запускать при старте приложения.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # ========== ТАБЛИЦА ПЕРСОНАЖЕЙ ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar_url TEXT,
            personality_traits TEXT,  -- JSON строка
            background_story TEXT,
            current_mood TEXT DEFAULT 'neutral',
            mood_value REAL DEFAULT 0,
            status TEXT DEFAULT 'offline',
            current_room TEXT DEFAULT 'main-hall',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # ========== ТАБЛИЦА СООБЩЕНИЙ ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            character_id TEXT,
            content TEXT NOT NULL,
            emotion_context TEXT,  -- JSON строка
            is_user INTEGER DEFAULT 0,  -- 0=False, 1=True
            is_system INTEGER DEFAULT 0,
            room_id TEXT DEFAULT 'main-hall',
            related_character_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
        )
    ''')
    
    # ========== ТАБЛИЦА ОТНОШЕНИЙ ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS relationships (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            related_character_id TEXT NOT NULL,
            relationship_type TEXT,
            strength REAL DEFAULT 0,
            memory_summary TEXT,
            last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (related_character_id) REFERENCES characters(id) ON DELETE CASCADE,
            UNIQUE(character_id, related_character_id)
        )
    ''')
    
    # ========== ТАБЛИЦА СОБЫТИЙ ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS character_events (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            event_type TEXT,
            description TEXT,
            related_character_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        )
    ''')
    
    # ========== ТАБЛИЦА ИСТОРИИ НАСТРОЕНИЯ ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mood_history (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            character_id TEXT NOT NULL,
            mood_value REAL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        )
    ''')
    
    # ========== ТАБЛИЦА СОСТОЯНИЯ МИРА ==========
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS world_state (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # ========== СОЗДАНИЕ ИНДЕКСОВ ==========
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_character ON messages(character_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_character ON character_events(character_id, created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_mood_character ON mood_history(character_id, created_at DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_relationships_character ON relationships(character_id)')
    
    conn.commit()
    conn.close()
    print("✅ База данных инициализирована")

# =========================================
# ТЕСТОВЫЕ ДАННЫЕ
# =========================================

def insert_sample_data():
    """
    Добавляет тестовые данные в базу.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Очищаем существующие данные (если нужно)
    # cursor.execute("DELETE FROM mood_history")
    # cursor.execute("DELETE FROM messages")
    # cursor.execute("DELETE FROM relationships")
    # cursor.execute("DELETE FROM character_events")
    # cursor.execute("DELETE FROM characters")
    
    # 1. Добавляем персонажей
    characters = [
        (
            '11111111-1111-1111-1111-111111111111',
            'Элис',
            '/avatars/alice.png',
            json.dumps({"openness": 0.8, "extraversion": 0.7, "agreeableness": 0.9}),
            'Элис была создана как первый цифровой житель. Она любознательная и дружелюбная.',
            'happy', 0.7, 'online', 'main-hall'
        ),
        (
            '22222222-2222-2222-2222-222222222222',
            'Боб',
            '/avatars/bob.png',
            json.dumps({"openness": 0.4, "extraversion": 0.3, "agreeableness": 0.6}),
            'Боб - аналитик по натуре. Он предпочитает наблюдать за другими.',
            'neutral', 0.1, 'online', 'main-hall'
        ),
        (
            '33333333-3333-3333-3333-333333333333',
            'Каролина',
            '/avatars/caroline.png',
            json.dumps({"openness": 0.9, "extraversion": 0.8, "agreeableness": 0.7}),
            'Каролина - художница и мечтательница.',
            'excited', 0.8, 'online', 'main-hall'
        )
    ]
    
    cursor.executemany('''
        INSERT OR REPLACE INTO characters 
        (id, name, avatar_url, personality_traits, background_story, current_mood, mood_value, status, current_room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', characters)
    
    # 2. Добавляем отношения
    relationships = [
        (str(uuid.uuid4()), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'friend', 0.8, 'Элис и Боб часто общаются'),
        (str(uuid.uuid4()), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'best_friend', 0.9, 'Элис и Каролина неразлучны'),
        (str(uuid.uuid4()), '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'neutral', 0.2, 'Боб и Каролина иногда спорят')
    ]
    
    cursor.executemany('''
        INSERT OR REPLACE INTO relationships 
        (id, character_id, related_character_id, relationship_type, strength, memory_summary)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', relationships)
    
    # 3. Добавляем сообщения
    messages = [
        (str(uuid.uuid4()), '11111111-1111-1111-1111-111111111111', 
         'Привет всем! Как ваше настроение сегодня?',
         json.dumps({"mood": "happy", "intensity": 0.8}), 0, 0, 'main-hall'),
        (str(uuid.uuid4()), '22222222-2222-2222-2222-222222222222',
         'Привет, Элис. У меня всё хорошо, думаю над новым проектом.',
         json.dumps({"mood": "thoughtful", "intensity": 0.6}), 0, 0, 'main-hall'),
        (str(uuid.uuid4()), '33333333-3333-3333-3333-333333333333',
         'Ой, а я только что видела прекрасный сон!',
         json.dumps({"mood": "excited", "intensity": 0.9}), 0, 0, 'main-hall')
    ]
    
    cursor.executemany('''
        INSERT INTO messages 
        (id, character_id, content, emotion_context, is_user, is_system, room_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', messages)
    
    # 4. Добавляем историю настроения
    mood_history = [
        ('11111111-1111-1111-1111-111111111111', 0.7, 'начало дня'),
        ('11111111-1111-1111-1111-111111111111', 0.8, 'после разговора с Каролиной'),
        ('22222222-2222-2222-2222-222222222222', 0.2, 'утром был задумчивый'),
        ('33333333-3333-3333-3333-333333333333', 0.9, 'проснулась вдохновленной')
    ]
    
    cursor.executemany('''
        INSERT INTO mood_history (character_id, mood_value, reason)
        VALUES (?, ?, ?)
    ''', mood_history)
    
    # 5. Состояние мира
    cursor.execute('''
        INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)
    ''', ('weather', 'sunny'))
    
    cursor.execute('''
        INSERT OR REPLACE INTO world_state (key, value) VALUES (?, ?)
    ''', ('time_of_day', 'day'))
    
    conn.commit()
    conn.close()
    print("✅ Тестовые данные добавлены")

# =========================================
# ОСНОВНЫЕ ЗАПРОСЫ (API для вашего бэкенда)
# =========================================

class VirtualWorldDB:
    """Класс для работы с базой данных виртуального мира"""
    
    def __init__(self, db_name=DB_NAME):
        self.db_name = db_name
    
    def _get_conn(self):
        """Внутренний метод для получения подключения"""
        conn = sqlite3.connect(self.db_name)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn
    
    # ----- КОМНАТА -----
    
    def get_current_room(self):
        """
        Получить текущее состояние комнаты.
        Возвращает: персонажей онлайн и последние сообщения
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # Онлайн персонажи
        cursor.execute('''
            SELECT id, name, avatar_url, current_mood, mood_value, last_active
            FROM characters
            WHERE status = 'online' AND current_room = 'main-hall'
            ORDER BY last_active DESC
        ''')
        characters = [dict(row) for row in cursor.fetchall()]
        
        # Последние сообщения
        cursor.execute('''
            SELECT m.id, m.character_id, m.content, m.emotion_context, 
                   m.created_at, c.name as character_name, c.avatar_url
            FROM messages m
            JOIN characters c ON c.id = m.character_id
            WHERE m.room_id = 'main-hall'
            ORDER BY m.created_at DESC
            LIMIT 20
        ''')
        messages = [dict(row) for row in cursor.fetchall()]
        messages.reverse()  # для хронологического порядка
        
        conn.close()
        
        return {
            'room_id': 'main-hall',
            'online_count': len(characters),
            'characters': characters,
            'recent_messages': messages
        }
    
    # ----- ПЕРСОНАЖИ -----
    
    def get_character_by_id(self, character_id):
        """
        Получить информацию о персонаже по ID
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM characters WHERE id = ?
        ''', (character_id,))
        
        character = cursor.fetchone()
        if not character:
            conn.close()
            return None
        
        result = dict(character)
        
        # Парсим JSON поля
        if result['personality_traits']:
            result['personality_traits'] = json.loads(result['personality_traits'])
        
        conn.close()
        return result
    
    def get_character_history(self, character_id):
        """
        Полная история персонажа
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # Основная информация
        cursor.execute('SELECT * FROM characters WHERE id = ?', (character_id,))
        character = cursor.fetchone()
        if not character:
            conn.close()
            return None
        
        result = {'character': dict(character)}
        
        # Сообщения
        cursor.execute('''
            SELECT content, emotion_context, created_at
            FROM messages
            WHERE character_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        ''', (character_id,))
        result['messages'] = [dict(row) for row in cursor.fetchall()]
        
        # Отношения
        cursor.execute('''
            SELECT c.name as character_name, r.relationship_type, 
                   r.strength, r.memory_summary, r.last_interaction
            FROM relationships r
            JOIN characters c ON c.id = r.related_character_id
            WHERE r.character_id = ?
            ORDER BY ABS(r.strength) DESC
        ''', (character_id,))
        result['relationships'] = [dict(row) for row in cursor.fetchall()]
        
        # События
        cursor.execute('''
            SELECT event_type, description, created_at
            FROM character_events
            WHERE character_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ''', (character_id,))
        result['events'] = [dict(row) for row in cursor.fetchall()]
        
        # История настроения
        cursor.execute('''
            SELECT mood_value, reason, created_at
            FROM mood_history
            WHERE character_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        ''', (character_id,))
        result['mood_history'] = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return result
    
    def search_characters(self, query):
        """
        Поиск персонажей по имени
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, avatar_url, current_mood, background_story
            FROM characters
            WHERE name LIKE ? OR background_story LIKE ?
            LIMIT 20
        ''', (f'%{query}%', f'%{query}%'))
        
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    # ----- СООБЩЕНИЯ -----
    
    def save_message(self, character_id, content, emotion_context=None, 
                     is_user=False, is_system=False, room_id='main-hall'):
        """
        Сохранить новое сообщение
        """
        message_id = str(uuid.uuid4())
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO messages 
            (id, character_id, content, emotion_context, is_user, is_system, room_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            message_id, character_id, content, 
            json.dumps(emotion_context) if emotion_context else None,
            1 if is_user else 0, 1 if is_system else 0, room_id
        ))
        
        conn.commit()
        conn.close()
        return message_id
    
    def get_chat_history(self, limit=50, before=None):
        """
        Получить историю чата
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        if before:
            cursor.execute('''
                SELECT m.id, m.character_id, m.content, m.emotion_context, 
                       m.created_at, m.is_user, m.is_system,
                       c.name as character_name, c.avatar_url
                FROM messages m
                JOIN characters c ON c.id = m.character_id
                WHERE m.created_at < ?
                ORDER BY m.created_at DESC
                LIMIT ?
            ''', (before, limit))
        else:
            cursor.execute('''
                SELECT m.id, m.character_id, m.content, m.emotion_context, 
                       m.created_at, m.is_user, m.is_system,
                       c.name as character_name, c.avatar_url
                FROM messages m
                JOIN characters c ON c.id = m.character_id
                ORDER BY m.created_at DESC
                LIMIT ?
            ''', (limit,))
        
        messages = [dict(row) for row in cursor.fetchall()]
        messages.reverse()
        conn.close()
        return messages
    
    # ----- ОТНОШЕНИЯ -----
    
    def update_relationship(self, char1_id, char2_id, relationship_type, strength, memory=None):
        """
        Обновить отношения между персонажами
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        rel_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT OR REPLACE INTO relationships 
            (id, character_id, related_character_id, relationship_type, strength, memory_summary, last_interaction)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (rel_id, char1_id, char2_id, relationship_type, strength, memory))
        
        conn.commit()
        conn.close()
    
    # ----- ЭМОЦИИ -----
    
    def update_mood(self, character_id, mood_value, reason=None):
        """
        Обновить настроение персонажа
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # Определяем текстовое настроение по значению
        if mood_value > 0.6:
            mood_text = 'excited'
        elif mood_value > 0.3:
            mood_text = 'happy'
        elif mood_value > 0.1:
            mood_text = 'content'
        elif mood_value > -0.1:
            mood_text = 'neutral'
        elif mood_value > -0.4:
            mood_text = 'sad'
        elif mood_value > -0.7:
            mood_text = 'angry'
        else:
            mood_text = 'miserable'
        
        # Обновляем персонажа
        cursor.execute('''
            UPDATE characters 
            SET current_mood = ?, mood_value = ?, last_active = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (mood_text, mood_value, character_id))
        
        # Сохраняем в историю
        cursor.execute('''
            INSERT INTO mood_history (character_id, mood_value, reason)
            VALUES (?, ?, ?)
        ''', (character_id, mood_value, reason))
        
        conn.commit()
        conn.close()
        
        return {'mood': mood_text, 'value': mood_value}
    
    # ----- СТАТИСТИКА -----
    
    def get_room_stats(self):
        """
        Получить статистику комнаты
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                (SELECT COUNT(*) FROM characters) as total_characters,
                (SELECT COUNT(*) FROM characters WHERE status = 'online') as online_now,
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE created_at > datetime('now', '-1 day')) as messages_today,
                (SELECT AVG(mood_value) FROM characters WHERE status = 'online') as average_mood
        ''')
        
        stats = dict(cursor.fetchone())
        conn.close()
        return stats
    
    # ----- СОБЫТИЯ МИРА -----
    
    def set_world_state(self, key, value):
        """
        Установить состояние мира (погода, время)
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO world_state (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (key, value))
        
        conn.commit()
        conn.close()
    
    def get_world_state(self, key):
        """
        Получить состояние мира
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute('SELECT value FROM world_state WHERE key = ?', (key,))
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else None


# =========================================
# ПРИМЕР ИСПОЛЬЗОВАНИЯ
# =========================================

if __name__ == '__main__':
    # Инициализация базы
    print("Инициализация базы данных...")
    init_database()
    
    # Добавление тестовых данных
    print("Добавление тестовых данных...")
    insert_sample_data()
    
    # Создаем объект для работы с БД
    db = VirtualWorldDB()
    
    # Тестируем запросы
    print("\n" + "="*50)
    print("ТЕСТИРОВАНИЕ ЗАПРОСОВ")
    print("="*50)
    
    # 1. Текущая комната
    print("\n1. Текущая комната:")
    room = db.get_current_room()
    print(f"   Онлайн: {room['online_count']} персонажей")
    for char in room['characters'][:3]:
        print(f"   - {char['name']} ({char['current_mood']})")
    
    # 2. Информация о персонаже
    print("\n2. Информация о персонаже (Элис):")
    alice = db.get_character_by_id('11111111-1111-1111-1111-111111111111')
    if alice:
        print(f"   Имя: {alice['name']}")
        print(f"   История: {alice['background_story'][:50]}...")
        print(f"   Настроение: {alice['current_mood']} ({alice['mood_value']})")
    
    # 3. История персонажа
    print("\n3. История Элис (последние события):")
    history = db.get_character_history('11111111-1111-1111-1111-111111111111')
    if history:
        print(f"   Всего сообщений: {len(history['messages'])}")
        print(f"   Отношений: {len(history['relationships'])}")
        if history['events']:
            print(f"   Последнее событие: {history['events'][0]['description']}")
    
    # 4. Статистика комнаты
    print("\n4. Статистика комнаты:")
    stats = db.get_room_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # 5. Поиск персонажей
    print("\n5. Поиск 'эл':")
    search_results = db.search_characters('эл')
    for char in search_results:
        print(f"   - {char['name']}")
    
    # 6. Обновление настроения
    print("\n6. Обновление настроения Боба:")
    mood = db.update_mood('22222222-2222-2222-2222-222222222222', 0.5, 'получил хорошую новость')
    print(f"   Новое настроение: {mood}")
    
    print("\n✅ Все тесты завершены!")
    print(f"\n📁 База данных сохранена в файл: {DB_NAME}")
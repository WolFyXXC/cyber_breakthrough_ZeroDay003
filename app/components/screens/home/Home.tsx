import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Цветовая схема в стиле #1C1C1E
const COLORS = {
  background: '#1C1C1E',      // Основной фон (темно-серый)
  surface: '#2C2C2E',         // Поверхность (светлее фона)
  surfaceLight: '#3A3A3C',    // Еще светлее для элементов
  accent: '#0A84FF',          // Синий акцент (как в iOS)
  accentLight: '#66AFFF',     // Светло-синий
  text: '#FFFFFF',            // Белый текст
  textSecondary: '#8E8E93',   // Серый для второстепенного текста
  border: '#38383A',          // Цвет границ
  unreadBadge: '#FF453A',     // Красный для непрочитанных
  incomingBubble: '#3A3A3C',  // Фон входящих сообщений
};

// Типы данных
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
};

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
  time: string;
  avatar?: string;
  messages: Message[];
};

// Начальные данные с сообщениями
const initialChats: Chat[] = [
  { 
    id: '1', 
    name: 'Анна', 
    lastMessage: 'Привет!', 
    unread: 2, 
    time: '10:30',
    messages: [
      { id: '101', text: 'Привет! Как дела?', sender: 'other', timestamp: new Date(Date.now() - 3600000) },
      { id: '102', text: 'Отлично, у тебя?', sender: 'user', timestamp: new Date(Date.now() - 3500000) },
      { id: '103', text: 'Тоже хорошо!', sender: 'other', timestamp: new Date(Date.now() - 3400000) },
    ]
  },
  { 
    id: '2', 
    name: 'Петр', 
    lastMessage: 'Ок', 
    unread: 0, 
    time: '09:15',
    messages: [
      { id: '201', text: 'Привет, Петр!', sender: 'user', timestamp: new Date(Date.now() - 86400000) },
      { id: '202', text: 'Здорово', sender: 'other', timestamp: new Date(Date.now() - 86300000) },
      { id: '203', text: 'Встречаемся в 18:00?', sender: 'user', timestamp: new Date(Date.now() - 86200000) },
      { id: '204', text: 'Ок', sender: 'other', timestamp: new Date(Date.now() - 86100000) },
    ]
  },
  { 
    id: '3', 
    name: 'Работа', 
    lastMessage: 'Созвон в 15:00', 
    unread: 5, 
    time: 'Вчера',
    messages: [
      { id: '301', text: 'Всем привет!', sender: 'other', timestamp: new Date(Date.now() - 172800000) },
      { id: '302', text: 'Завтра созвон в 15:00', sender: 'other', timestamp: new Date(Date.now() - 171800000) },
      { id: '303', text: 'Ок, буду', sender: 'user', timestamp: new Date(Date.now() - 170800000) },
    ]
  },
];

// Компонент сообщения
const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.sender === 'user';
  const { width } = useWindowDimensions();
  
  return (
    <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
      <View 
        style={{ 
          maxWidth: width * 0.75,
          backgroundColor: isUser ? COLORS.accent : COLORS.incomingBubble,
        }}
        className={`p-3 rounded-2xl ${
          isUser ? 'rounded-br-none' : 'rounded-bl-none'
        }`}
      >
        <Text style={{ color: COLORS.text }}>
          {message.text}
        </Text>
        <Text style={{ 
          color: isUser ? 'rgba(255,255,255,0.7)' : COLORS.textSecondary,
          fontSize: 10,
          marginTop: 4
        }}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );
};

// Компонент списка чатов
const ChatList = ({ 
  chats, 
  onSelectChat,
  windowWidth 
}: { 
  chats: Chat[]; 
  onSelectChat: (chat: Chat) => void;
  windowWidth: number;
}) => {
  const avatarSize = windowWidth < 375 ? 40 : 48;
  const fontSize = windowWidth < 375 ? 16 : 18;
  
  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelectChat(item)}
          style={{ 
            backgroundColor: COLORS.background,
            borderBottomColor: COLORS.border 
          }}
          className="flex-row items-center px-4 py-3 border-b active:opacity-80"
        >
          <View 
            style={{ 
              width: avatarSize, 
              height: avatarSize,
              backgroundColor: COLORS.accent 
            }}
            className="rounded-full items-center justify-center"
          >
            <Text style={{ fontSize: fontSize * 0.7, color: COLORS.text }} className="font-bold">
              {item.name[0]}
            </Text>
          </View>
          
          <View className="flex-1 ml-3">
            <View className="flex-row justify-between items-center">
              <Text 
                style={{ 
                  fontSize: fontSize * 0.9,
                  color: COLORS.text 
                }}
                className="font-bold"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={{ color: COLORS.textSecondary }} className="text-xs">
                {item.time}
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center mt-1">
              <Text 
                style={{ color: COLORS.textSecondary }}
                className="text-sm flex-1 mr-2" 
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
              {item.unread > 0 && (
                <View style={{ backgroundColor: COLORS.unreadBadge }} className="rounded-full min-w-5 px-2 py-0.5">
                  <Text className="text-white text-xs font-bold text-center">
                    {item.unread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

// Компонент окна чата
const ChatWindow = ({ 
  chat, 
  onBack,
  onSendMessage,
  windowWidth,
  insets
}: { 
  chat: Chat; 
  onBack: () => void;
  onSendMessage: (text: string) => void;
  windowWidth: number;
  insets: any;
}) => {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(chat.messages);

  const handleSend = () => {
    if (messageText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  const avatarSize = windowWidth < 375 ? 36 : 40;
  const headerFontSize = windowWidth < 375 ? 16 : 18;

  return (
    <KeyboardAvoidingView 
      style={{ backgroundColor: COLORS.background }}
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Шапка чата */}
      <View 
        style={{ 
          paddingTop: insets.top || StatusBar.currentHeight || 0,
          backgroundColor: COLORS.surface,
          borderBottomColor: COLORS.border
        }}
        className="border-b"
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity 
            onPress={onBack} 
            className="mr-3 p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <View 
            style={{ 
              width: avatarSize, 
              height: avatarSize,
              backgroundColor: COLORS.accent 
            }}
            className="rounded-full items-center justify-center mr-3"
          >
            <Text style={{ fontSize: avatarSize * 0.5, color: COLORS.text }} className="font-bold">
              {chat.name[0]}
            </Text>
          </View>
          
          <View className="flex-1">
            <Text 
              style={{ 
                fontSize: headerFontSize,
                color: COLORS.text 
              }}
              className="font-bold"
            >
              {chat.name}
            </Text>
            <Text style={{ color: '#30D158' }} className="text-xs">online</Text>
          </View>
        </View>
      </View>

      {/* Сообщения */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        style={{ backgroundColor: COLORS.background }}
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Поле ввода - с вашим стилем */}
      <View 
        style={{ 
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: insets.bottom || 10,
        }}
        className="flex-row items-center p-3 border-t"
      >
        <TouchableOpacity className="mr-2 p-2">
          <Ionicons name="attach" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Напишите сообщение..."
          placeholderTextColor={COLORS.textSecondary}
          style={{ 
            backgroundColor: COLORS.background,
            color: COLORS.text,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
          className="flex-1 rounded-full px-4 py-2 mr-2"
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity
          onPress={handleSend}
          disabled={!messageText.trim()}
          style={{ 
            opacity: messageText.trim() ? 1 : 0.5,
            backgroundColor: COLORS.accent,
            ...(Platform.OS === 'ios' ? {
              shadowColor: COLORS.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            } : {
              elevation: 5,
            })
          }}
          className="rounded-full w-10 h-10 items-center justify-center"
        >
          <Ionicons name="send" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Главный компонент
const ChatsManager = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatsData, setChatsData] = useState<Chat[]>(initialChats);
  const { width, height } = useWindowDimensions();
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });

  const isTablet = width >= 768;
  const isLandscape = width > height;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Для iOS используем SafeAreaView
    }
  }, []);

  const handleSendMessage = (text: string) => {
    if (selectedChat) {
      setChatsData(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                lastMessage: text,
                time: 'только что',
                messages: [
                  ...chat.messages,
                  {
                    id: Date.now().toString(),
                    text,
                    sender: 'user',
                    timestamp: new Date(),
                  },
                ],
              }
            : chat
        )
      );
    }
  };

  // Для планшетов в ландшафтном режиме
  if (isTablet && isLandscape) {
    return (
      <SafeAreaView style={{ backgroundColor: COLORS.background }} className="flex-1">
        <View className="flex-1 flex-row">
          {/* Левая колонка - список чатов */}
          <View style={{ width: width * 0.35, backgroundColor: COLORS.background }} className="border-r" >
            <View style={{ backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }} className="p-4 border-b">
              <Text style={{ color: COLORS.text }} className="text-2xl font-bold">Чаты</Text>
            </View>
            <ChatList 
              chats={chatsData} 
              onSelectChat={setSelectedChat}
              windowWidth={width * 0.35}
            />
          </View>

          {/* Правая колонка - активный чат */}
          <View style={{ width: width * 0.65, backgroundColor: COLORS.background }}>
            {selectedChat ? (
              <ChatWindow
                chat={selectedChat}
                onBack={() => setSelectedChat(null)}
                onSendMessage={handleSendMessage}
                windowWidth={width * 0.65}
                insets={insets}
              />
            ) : (
              <View style={{ backgroundColor: COLORS.background }} className="flex-1 items-center justify-center">
                <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary }} className="mt-4">Выберите чат</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Для телефонов или планшетов в портретном режиме
  return (
    <SafeAreaView style={{ backgroundColor: COLORS.background }} className="flex-1">
      {!selectedChat ? (
        <>
          <View style={{ backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }} className="px-4 py-3 border-b">
            <Text 
              style={{ fontSize: width < 375 ? 20 : 24, color: COLORS.text }}
              className="font-bold"
            >
              Чаты
            </Text>
          </View>
          <ChatList 
            chats={chatsData} 
            onSelectChat={setSelectedChat}
            windowWidth={width}
          />
        </>
      ) : (
        <ChatWindow
          chat={selectedChat}
          onBack={() => setSelectedChat(null)}
          onSendMessage={handleSendMessage}
          windowWidth={width}
          insets={insets}
        />
      )}
    </SafeAreaView>
  );
};

export default ChatsManager;
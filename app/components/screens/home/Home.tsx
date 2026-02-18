import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';

// ==================== TYPES ====================

type Message = {
  id: string;
  character_id: string;
  character_name: string;
  content: string;
  emotion?: string;
  is_user: boolean;
  timestamp: string;
};

type Agent = {
  name: string;
  mood: string;
  memory_count: number;
  last_message?: string;
  online?: boolean;
};

type AgentsStatus = Record<string, Agent>;

type MoodUpdateData = {
  characterId: string;
  characterName: string;
  newMood: string;
  message: string;
};

type WorldEventData = {
  event: string;
  timestamp: string;
};

type RoomHistoryData = Message[];

type SocketErrorData = {
  message: string;
};

// ==================== COLORS ====================

const COLORS = {
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceLight: '#3A3A3C',
  accent: '#0A84FF',
  accentLight: '#66AFFF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  unreadBadge: '#FF453A',
  incomingBubble: '#3A3A3C',
  online: '#30D158',
  offline: '#8E8E93',
} as const;

// ==================== COMPONENTS ====================

interface MessageBubbleProps {
  message: Message;
  width: number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, width }) => {
  const isUser = message.is_user;
  
  const getMoodColor = (mood?: string): string => {
    const colors: Record<string, string> = {
      'радостная': '#30D158',
      'грустный': '#FF9F0A',
      'нейтральный': '#8E8E93',
      'взволнованный': '#5E5CE6'
    };
    return (mood && colors[mood]) || COLORS.textSecondary;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && (
        <View className="flex-row items-center mb-1">
          <View 
            style={{ backgroundColor: getMoodColor(message.emotion) }} 
            className="w-2 h-2 rounded-full mr-2" 
          />
          <Text style={{ color: COLORS.textSecondary }} className="text-xs">
            {message.character_name}
            {message.emotion && ` · ${message.emotion}`}
          </Text>
        </View>
      )}
      
      <View style={{ 
        maxWidth: width * 0.7,
        backgroundColor: isUser ? COLORS.accent : COLORS.incomingBubble,
      }} className={`p-3 rounded-2xl ${
        isUser ? 'rounded-br-none' : 'rounded-bl-none'
      }`}>
        <Text style={{ color: COLORS.text }}>{message.content}</Text>
        <Text style={{ 
          color: isUser ? 'rgba(255,255,255,0.7)' : COLORS.textSecondary,
          fontSize: 10,
          marginTop: 4
        }}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

interface AgentsListProps {
  agents: AgentsStatus;
  selectedAgent: string | null;
  onSelectAgent: (agentName: string | null) => void;
}

const AgentsList: React.FC<AgentsListProps> = ({ 
  agents, 
  selectedAgent, 
  onSelectAgent 
}) => {
  const getMoodColor = (mood: string): string => {
    const colors: Record<string, string> = {
      'радостная': '#30D158',
      'грустный': '#FF9F0A',
      'нейтральный': '#8E8E93',
      'взволнованный': '#5E5CE6'
    };
    return colors[mood] || COLORS.textSecondary;
  };

  const agentsArray = Object.values(agents);

  const renderAgent: ListRenderItem<Agent> = ({ item }) => (
    <TouchableOpacity
      onPress={() => onSelectAgent(
        selectedAgent === item.name ? null : item.name
      )}
      style={{
        backgroundColor: selectedAgent === item.name 
          ? COLORS.accent 
          : COLORS.surface,
        borderColor: COLORS.border
      }}
      className="flex-row items-center mr-3 px-4 py-2 rounded-full border"
    >
      <View style={{ 
        backgroundColor: getMoodColor(item.mood) 
      }} className="w-2 h-2 rounded-full mr-2" />
      <Text style={{ color: COLORS.text }} className="font-medium">
        {item.name}
      </Text>
      <Text style={{ color: COLORS.textSecondary }} className="text-xs ml-2">
        {item.mood}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      horizontal
      data={agentsArray}
      keyExtractor={(item) => item.name}
      renderItem={renderAgent}
      showsHorizontalScrollIndicator={false}
      className="py-2"
      contentContainerStyle={{ paddingHorizontal: 12 }}
      ListEmptyComponent={
        <View className="py-2">
          <Text style={{ color: COLORS.textSecondary }}>
            Загрузка агентов...
          </Text>
        </View>
      }
    />
  );
};

// ==================== MAIN COMPONENT ====================

const VirtualWorldChat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentsStatus>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const isTablet = width >= 768;

  // WebSocket connection
  useEffect(() => {
    const SOCKET_URL = 'http://localhost:3000';
    const newSocket = io(SOCKET_URL);
    
    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Подключено к серверу');
      setIsConnected(true);
      newSocket.emit('join_room', 'main-hall');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Отключено от сервера');
      setIsConnected(false);
    });

    // Data events
    newSocket.on('room_history', (historyMessages: RoomHistoryData) => {
      setMessages(historyMessages);
    });

    newSocket.on('agents_status', (agentsData: AgentsStatus) => {
      setAgents(agentsData);
    });

    newSocket.on('agents_status_update', (agentsData: AgentsStatus) => {
      setAgents(prev => ({ ...prev, ...agentsData }));
    });

    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      // Scroll to bottom on new message
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    });

    newSocket.on('mood_update', (data: MoodUpdateData) => {
      // Update agent mood
      setAgents(prev => ({
        ...prev,
        [data.characterName]: {
          ...prev[data.characterName],
          mood: data.newMood
        }
      }));
    });

    newSocket.on('world_event', (event: WorldEventData) => {
      // Show world event
      Alert.alert('🌍 Событие в мире', event.event);
    });

    // Error handling
    newSocket.on('error', (error: SocketErrorData) => {
      Alert.alert('Ошибка', error.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (): void => {
    if (!messageText.trim() || !selectedAgent || !socket) return;

    setIsLoading(true);
    
    socket.emit('user_message', {
      characterId: selectedAgent,
      message: messageText
    });

    // Add user message locally
    const userMessage: Message = {
      id: Date.now().toString(),
      character_id: 'user',
      character_name: 'Вы',
      content: messageText,
      is_user: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessageText('');
    
    setTimeout(() => {
      setIsLoading(false);
      flatListRef.current?.scrollToEnd();
    }, 100);
  };

  const handleSubmitEditing = (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ): void => {
    sendMessage();
  };

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <MessageBubble message={item} width={width} />
  );

  return (
    <SafeAreaView style={{ backgroundColor: COLORS.background }} className="flex-1">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View 
        style={{ 
          backgroundColor: COLORS.surface, 
          borderBottomColor: COLORS.border 
        }} 
        className="px-4 py-3 border-b"
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: COLORS.text }} className="text-xl font-bold">
            Виртуальный мир
          </Text>
          <View className="flex-row items-center">
            <View style={{ 
              backgroundColor: isConnected ? COLORS.online : COLORS.offline 
            }} className="w-2 h-2 rounded-full mr-2" />
            <Text style={{ color: COLORS.textSecondary }}>
              {isConnected ? 'Онлайн' : 'Офлайн'}
            </Text>
          </View>
        </View>
        
        {/* Agents list */}
        <AgentsList 
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-10">
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary }} className="mt-4 text-center">
              Нет сообщений.{'\n'}
              Выберите агента и начните диалог!
            </Text>
          </View>
        }
      />

      {/* Loading indicator */}
      {isLoading && (
        <View className="items-center py-2">
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}

      {/* Input field */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ 
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border
        }} className="flex-row items-center p-3 border-t">
          
          {selectedAgent && (
            <View style={{ backgroundColor: COLORS.accent }} 
                  className="rounded-full px-3 py-1 mr-2">
              <Text style={{ color: COLORS.text }} className="text-xs">
                {selectedAgent}
              </Text>
            </View>
          )}
          
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            onSubmitEditing={handleSubmitEditing}
            placeholder={selectedAgent 
              ? `Сообщение ${selectedAgent}...` 
              : "Выберите агента..."
            }
            placeholderTextColor={COLORS.textSecondary}
            style={{ 
              backgroundColor: COLORS.background,
              color: COLORS.text,
              borderColor: COLORS.border
            }}
            className="flex-1 rounded-full px-4 py-2 mr-2 border"
            multiline
            maxLength={500}
            editable={!!selectedAgent}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!selectedAgent || !messageText.trim() || isLoading}
            style={{ 
              opacity: (selectedAgent && messageText.trim() && !isLoading) ? 1 : 0.5,
              backgroundColor: COLORS.accent
            }}
            className="rounded-full w-10 h-10 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VirtualWorldChat;
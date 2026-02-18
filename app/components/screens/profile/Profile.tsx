import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  useWindowDimensions,
  Linking,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceLight: '#3A3A3C',
  accent: '#0A84FF',
  accentLight: '#66AFFF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  purple: '#BF5AF2',
  pink: '#FF375F',
  yellow: '#FFD60A',
};

// Типы данных для нейросети
type NeuralNetwork = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'Текст' | 'Изображения' | 'Видео' | 'Аудио' | 'Код' | '3D' | 'Анализ';
  rating: number;
  reviews: number;
  isFavorite: boolean;
  isNew: boolean;
  isPopular: boolean;
  price: 'Бесплатно' | 'Freemium' | 'Платно';
  features: string[];
  useCases: string[];
  requirements: string[];
  website: string;
  apiAvailable: boolean;
  languages: string[];
  color: string;
  developer: string;
  releaseDate: string;
  version: string;
  usersCount: string;
};

// Данные нейросетей
const neuralNetworks: NeuralNetwork[] = [
  {
    id: '1',
    name: 'GPT-4 Turbo',
    shortDescription: 'Самая мощная языковая модель для текста и кода',
    description: 'GPT-4 Turbo — это передовая языковая модель от OpenAI, которая превосходит предыдущие версии по всем параметрам. Она поддерживает контекст до 128K токенов, работает быстрее и дешевле, при этом показывает лучшие результаты в понимании и генерации текста, написании кода, решении сложных задач и креативном письме.',
    icon: 'chatbubbles',
    category: 'Текст',
    rating: 4.9,
    reviews: 15420,
    isFavorite: true,
    isNew: false,
    isPopular: true,
    price: 'Freemium',
    features: [
      'Контекст 128K токенов',
      'Поддержка 50+ языков',
      'Генерация и отладка кода',
      'Работа с файлами',
      'API доступ',
      'Функции вызова (Function Calling)'
    ],
    useCases: [
      'Написание и редактирование текстов',
      'Программирование',
      'Анализ данных',
      'Образование',
      'Бизнес-коммуникации',
      'Креативные проекты'
    ],
    requirements: [
      'Интернет-соединение',
      'Браузер или API доступ',
      'Аккаунт OpenAI'
    ],
    website: 'https://openai.com/gpt-4',
    apiAvailable: true,
    languages: ['Русский', 'Английский', 'Китайский', 'Испанский', 'Французский', 'Немецкий'],
    color: '#10A37F',
    developer: 'OpenAI',
    releaseDate: '2023',
    version: 'GPT-4 Turbo',
    usersCount: '10M+'
  },
  {
    id: '2',
    name: 'Midjourney V6',
    shortDescription: 'Генерация фотореалистичных изображений по тексту',
    description: 'Midjourney V6 — это революционная нейросеть для генерации изображений, которая создает невероятно реалистичные и художественные картинки по текстовому описанию. Версия 6 приносит улучшенное понимание промптов, более высокое разрешение, лучшую анатомию и реалистичность.',
    icon: 'image',
    category: 'Изображения',
    rating: 4.8,
    reviews: 28300,
    isFavorite: true,
    isNew: true,
    isPopular: true,
    price: 'Платно',
    features: [
      'Фотореалистичные изображения',
      'Разрешение до 1792x1024',
      'Стилизация и референсы',
      'Редактирование изображений',
      'Пакетная генерация',
      'Веб-интерфейс и Discord'
    ],
    useCases: [
      'Иллюстрации и концепт-арт',
      'Дизайн и маркетинг',
      'Фотореалистичные рендеры',
      'Архитектура и интерьеры',
      'Мода и стиль',
      'Творческие проекты'
    ],
    requirements: [
      'Интернет-соединение',
      'Аккаунт Discord или сайт',
      'Платная подписка'
    ],
    website: 'https://www.midjourney.com',
    apiAvailable: false,
    languages: ['Английский'],
    color: '#5B6BF5',
    developer: 'Midjourney Inc.',
    releaseDate: '2023',
    version: 'V6',
    usersCount: '15M+'
  },
  {
    id: '3',
    name: 'Claude 3 Opus',
    shortDescription: 'Интеллектуальный ассистент для сложных задач',
    description: 'Claude 3 Opus — самая умная модель семейства Claude от Anthropic. Она превосходит конкурентов в сложных рассуждениях, математике, программировании и понимании нюансов. Обладает контекстом в 200K токенов и улучшенной безопасностью.',
    icon: 'school',
    category: 'Текст',
    rating: 4.9,
    reviews: 8200,
    isFavorite: false,
    isNew: true,
    isPopular: false,
    price: 'Платно',
    features: [
      'Контекст 200K токенов',
      'Улучшенное рассуждение',
      'Математика и логика',
      'Программирование',
      'Анализ документов',
      'Безопасность (Constitutional AI)'
    ],
    useCases: [
      'Научные исследования',
      'Сложный анализ данных',
      'Юриспруденция',
      'Финансовый анализ',
      'Образование',
      'Консалтинг'
    ],
    requirements: [
      'Интернет-соединение',
      'Доступ через API или сайт',
      'Платная подписка'
    ],
    website: 'https://www.anthropic.com/claude',
    apiAvailable: true,
    languages: ['Английский', 'Французский', 'Испанский', 'Японский'],
    color: '#9B6B9E',
    developer: 'Anthropic',
    releaseDate: '2024',
    version: '3 Opus',
    usersCount: '1M+'
  },
  {
    id: '4',
    name: 'DALL-E 3',
    shortDescription: 'Генерация и редактирование изображений',
    description: 'DALL-E 3 от OpenAI — это передовая модель для генерации изображений, которая лучше других понимает сложные промпты и создает точные, детальные картинки. Интегрирована с ChatGPT для удобного создания промптов.',
    icon: 'color-palette',
    category: 'Изображения',
    rating: 4.7,
    reviews: 12500,
    isFavorite: false,
    isNew: false,
    isPopular: true,
    price: 'Freemium',
    features: [
      'Точное следование промпту',
      'Редактирование (Inpainting)',
      'Вариации изображений',
      'Интеграция с ChatGPT',
      'Высокое разрешение',
      'Безопасный контент'
    ],
    useCases: [
      'Графический дизайн',
      'Маркетинговые материалы',
      'Контент для соцсетей',
      'Образование',
      'Прототипирование',
      'Творчество'
    ],
    requirements: [
      'Интернет-соединение',
      'ChatGPT Plus подписка',
      'API доступ'
    ],
    website: 'https://openai.com/dall-e-3',
    apiAvailable: true,
    languages: ['Английский', 'Русский', 'Китайский', 'Испанский'],
    color: '#F97316',
    developer: 'OpenAI',
    releaseDate: '2023',
    version: 'DALL-E 3',
    usersCount: '5M+'
  },
  {
    id: '5',
    name: 'Stable Video',
    shortDescription: 'Генерация видео из текста и изображений',
    description: 'Stable Video Diffusion от Stability AI — первая мощная открытая модель для генерации видео. Позволяет создавать короткие видео из текстовых описаний, анимировать изображения и делать интерполяцию между кадрами.',
    icon: 'videocam',
    category: 'Видео',
    rating: 4.5,
    reviews: 3400,
    isFavorite: false,
    isNew: true,
    isPopular: false,
    price: 'Бесплатно',
    features: [
      'Генерация из текста',
      'Анимация изображений',
      'Интерполяция кадров',
      'Открытый исходный код',
      'Локальный запуск',
      'До 4 секунд видео'
    ],
    useCases: [
      'Короткие видео для соцсетей',
      'Анимация иллюстраций',
      'Моушн-дизайн',
      'Реклама',
      'Прототипирование',
      'Творческие эксперименты'
    ],
    requirements: [
      'Мощный компьютер (GPU)',
      'Python и зависимости',
      'Или через Hugging Face'
    ],
    website: 'https://stability.ai/stable-video',
    apiAvailable: true,
    languages: ['Английский'],
    color: '#9159F2',
    developer: 'Stability AI',
    releaseDate: '2023',
    version: 'SVD',
    usersCount: '500K+'
  },
  {
    id: '6',
    name: 'ElevenLabs',
    shortDescription: 'Реалистичный синтез и клонирование голоса',
    description: 'ElevenLabs — лучшая нейросеть для генерации речи. Создает невероятно реалистичные голоса на десятках языков с передачей эмоций, интонаций и стилей. Поддерживает клонирование голоса и озвучку длинных текстов.',
    icon: 'mic',
    category: 'Аудио',
    rating: 4.8,
    reviews: 8900,
    isFavorite: true,
    isNew: false,
    isPopular: true,
    price: 'Freemium',
    features: [
      'Реалистичная генерация речи',
      'Клонирование голоса',
      '50+ языков и акцентов',
      'Эмоции и стили',
      'Длинные тексты',
      'API доступ'
    ],
    useCases: [
      'Озвучка видео и подкастов',
      'Аудиокниги',
      'Голосовые ассистенты',
      'Игры и персонажи',
      'Образование',
      'Доступность'
    ],
    requirements: [
      'Интернет-соединение',
      'Аккаунт ElevenLabs',
      'API ключ для разработки'
    ],
    website: 'https://elevenlabs.io',
    apiAvailable: true,
    languages: ['Русский', 'Английский', 'Немецкий', 'Французский', 'Испанский', 'Польский'],
    color: '#FF6B6B',
    developer: 'ElevenLabs',
    releaseDate: '2023',
    version: 'V2',
    usersCount: '2M+'
  }
];

// Компонент рейтинга звездочками
const RatingStars = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <View className="flex-row items-center">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return <Ionicons key={i} name="star" size={16} color="#FFD60A" />;
        } else if (i === fullStars && hasHalfStar) {
          return <Ionicons key={i} name="star-half" size={16} color="#FFD60A" />;
        } else {
          return <Ionicons key={i} name="star-outline" size={16} color="#FFD60A" />;
        }
      })}
      <Text className="text-gray-400 text-xs ml-1">{rating.toFixed(1)}</Text>
    </View>
  );
};

// Компонент карточки нейросети
const NeuralCard = ({ 
  item, 
  onPress 
}: { 
  item: NeuralNetwork; 
  onPress: () => void;
}) => {
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Текст': return 'document-text';
      case 'Изображения': return 'image';
      case 'Видео': return 'videocam';
      case 'Аудио': return 'mic';
      case 'Код': return 'code-slash';
      case '3D': return 'cube';
      default: return 'apps';
    }
  };

  const getPriceColor = (price: string) => {
    switch(price) {
      case 'Бесплатно': return 'text-green-400';
      case 'Freemium': return 'text-yellow-400';
      case 'Платно': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <LinearGradient
        colors={[`${item.color}20`, COLORS.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="p-4"
      >
        <View className="flex-row">
          {/* Иконка */}
          <View 
            className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: `${item.color}30` }}
          >
            <Ionicons name={item.icon} size={32} color={item.color} />
          </View>

          {/* Основная информация */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Text className="text-white font-bold text-lg mr-2">{item.name}</Text>
                {item.isNew && (
                  <View className="bg-green-500 px-2 py-0.5 rounded-full">
                    <Text className="text-white text-xs font-bold">NEW</Text>
                  </View>
                )}
                {item.isPopular && (
                  <View className="bg-orange-500 px-2 py-0.5 rounded-full ml-1">
                    <Text className="text-white text-xs font-bold">🔥</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity>
                <Ionicons 
                  name={item.isFavorite ? "heart" : "heart-outline"} 
                  size={22} 
                  color={item.isFavorite ? "#FF453A" : "#8E8E93"} 
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-1">
              <Ionicons name={getCategoryIcon(item.category)} size={14} color="#8E8E93" />
              <Text className="text-gray-400 text-xs ml-1 mr-3">{item.category}</Text>
              <RatingStars rating={item.rating} />
              <Text className="text-gray-400 text-xs ml-1">({item.reviews.toLocaleString()})</Text>
            </View>

            <Text className="text-gray-300 text-sm mt-2" numberOfLines={2}>
              {item.shortDescription}
            </Text>

            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center">
                <View className={`px-2 py-1 rounded-full ${getPriceColor(item.price)} bg-opacity-20`} style={{ backgroundColor: `${item.color}20` }}>
                  <Text className={`text-xs font-medium ${getPriceColor(item.price)}`}>
                    {item.price}
                  </Text>
                </View>
                {item.apiAvailable && (
                  <View className="ml-2 px-2 py-1 rounded-full bg-blue-500 bg-opacity-20">
                    <Text className="text-blue-400 text-xs font-medium">API</Text>
                  </View>
                )}
              </View>
              <Text className="text-gray-400 text-xs">{item.usersCount} users</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Компонент фильтра
const FilterButton = ({ 
  label, 
  active, 
  onPress 
}: { 
  label: string; 
  active: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 py-2 rounded-full mr-2 ${active ? 'bg-blue-500' : 'bg-gray-800'}`}
  >
    <Text className={active ? 'text-white font-medium' : 'text-gray-400'}>{label}</Text>
  </TouchableOpacity>
);

// Компонент детальной информации
const NeuralDetail = ({ 
  item, 
  visible, 
  onClose 
}: { 
  item: NeuralNetwork | null; 
  visible: boolean; 
  onClose: () => void;
}) => {
  const { width, height } = useWindowDimensions();

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View 
          className="bg-[#1C1C1E] rounded-t-3xl mt-12"
          style={{ 
            height: height * 0.9,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10
          }}
        >
          {/* Градиентная шапка */}
          <LinearGradient
            colors={[item.color, COLORS.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6 rounded-t-3xl"
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <View className="flex-row">
                <TouchableOpacity className="p-2">
                  <Ionicons name="share-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2">
                  <Ionicons 
                    name={item.isFavorite ? "heart" : "heart-outline"} 
                    size={22} 
                    color={item.isFavorite ? "#FF453A" : "white"} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="items-center mt-2">
              <View 
                className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Ionicons name={item.icon} size={48} color="white" />
              </View>
              <Text className="text-white text-3xl font-bold">{item.name}</Text>
              <View className="flex-row items-center mt-2">
                <View className="px-3 py-1 rounded-full bg-white/20">
                  <Text className="text-white text-sm">{item.category}</Text>
                </View>
                <View className="flex-row items-center ml-3">
                  <RatingStars rating={item.rating} />
                  <Text className="text-white text-xs ml-1">({item.reviews.toLocaleString()})</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Контент */}
          <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
            {/* Описание */}
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-2">Описание</Text>
              <Text className="text-gray-300 leading-6">{item.description}</Text>
            </View>

            {/* Характеристики */}
            <View className="flex-row flex-wrap mb-6">
              <View className="w-1/2 mb-4">
                <Text className="text-gray-400 text-xs mb-1">Разработчик</Text>
                <Text className="text-white font-medium">{item.developer}</Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-gray-400 text-xs mb-1">Версия</Text>
                <Text className="text-white font-medium">{item.version}</Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-gray-400 text-xs mb-1">Релиз</Text>
                <Text className="text-white font-medium">{item.releaseDate}</Text>
              </View>
              <View className="w-1/2 mb-4">
                <Text className="text-gray-400 text-xs mb-1">Пользователей</Text>
                <Text className="text-white font-medium">{item.usersCount}</Text>
              </View>
            </View>

            {/* Особенности */}
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">Особенности</Text>
              {item.features.map((feature, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={18} color={item.color} />
                  <Text className="text-gray-300 ml-2">{feature}</Text>
                </View>
              ))}
            </View>

            {/* Применение */}
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">Для чего использовать</Text>
              <View className="flex-row flex-wrap">
                {item.useCases.map((useCase, index) => (
                  <View 
                    key={index} 
                    className="px-3 py-2 rounded-full mr-2 mb-2"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Text style={{ color: item.color }} className="text-sm">{useCase}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Языки */}
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">Поддерживаемые языки</Text>
              <View className="flex-row flex-wrap">
                {item.languages.map((lang, index) => (
                  <View 
                    key={index} 
                    className="px-3 py-2 rounded-full bg-gray-800 mr-2 mb-2"
                  >
                    <Text className="text-gray-300 text-sm">{lang}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Системные требования */}
            <View className="mb-6">
              <Text className="text-white text-lg font-bold mb-3">Требования</Text>
              {item.requirements.map((req, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Ionicons name="information-circle" size={18} color="#8E8E93" />
                  <Text className="text-gray-300 ml-2">{req}</Text>
                </View>
              ))}
            </View>

            {/* Кнопки действий */}
            <View className="flex-row mb-8">
              <TouchableOpacity
                onPress={() => Linking.openURL(item.website)}
                className="flex-1 bg-blue-500 rounded-2xl py-4 items-center mr-2"
              >
                <Text className="text-white font-bold">Перейти на сайт</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-14 h-14 bg-gray-800 rounded-2xl items-center justify-center"
              >
                <Ionicons name="bookmark-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Главный компонент
const NeuralProfiles = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedNeural, setSelectedNeural] = useState<NeuralNetwork | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();

  const categories = ['Все', 'Текст', 'Изображения', 'Видео', 'Аудио', 'Код', '3D', 'Анализ'];

  const filteredNetworks = selectedCategory === 'Все'
    ? neuralNetworks
    : neuralNetworks.filter(n => n.category === selectedCategory);

  const handleOpenDetails = (item: NeuralNetwork) => {
    setSelectedNeural(item);
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1C1C1E]">
      {/* Шапка */}
      <View className="px-4 py-4 border-b border-gray-800">
        <Text className="text-white text-2xl font-bold">Нейросети</Text>
        <Text className="text-gray-400 text-sm mt-1">
          {filteredNetworks.length} моделей доступно
        </Text>

        {/* Категории */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        >
          {categories.map((cat) => (
            <FilterButton
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Список нейросетей */}
      <FlatList
        data={filteredNetworks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NeuralCard 
            item={item} 
            onPress={() => handleOpenDetails(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* Модальное окно с деталями */}
      <NeuralDetail
        item={selectedNeural}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default NeuralProfiles;
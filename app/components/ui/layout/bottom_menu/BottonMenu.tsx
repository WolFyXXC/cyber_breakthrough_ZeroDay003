import { FC } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TypeRootStackParamList } from '@/navigation/navigation.types';
import { TypeNavigate } from './menu.interface';

interface IBottomMenu {
    nav: TypeNavigate;
    currentRoute?: keyof TypeRootStackParamList;
}

const BottomMenu: FC<IBottomMenu> = ({ nav, currentRoute }) => {
    const { bottom } = useSafeAreaInsets();
    
    const tabs: { name: keyof TypeRootStackParamList; label: string }[] = [
        { name: 'Home', label: 'Главная' },
        { name: 'Profile', label: 'Профиль' },
    ];

    return (
        <View 
            className="flex-row justify-around items-center pt-3"
            style={{
                paddingBottom: bottom + 10,
                backgroundColor: '#1C1C1E',
                borderTopWidth: 1,
                borderTopColor: '#2C2C2E',
            }}
        >
            {tabs.map((tab) => {
                const isActive = currentRoute === tab.name;
                
                return (
                    <TouchableOpacity
                        key={tab.name}
                        onPress={() => nav(tab.name)}
                        className="items-center justify-center flex-1 py-2"
                    >
                        <View className={`w-1 h-1 rounded-full mb-2 ${isActive ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <Text className={`${isActive ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default BottomMenu;
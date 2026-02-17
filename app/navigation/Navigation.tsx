import {FC, useEffect, useState} from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TypeRootStackParamList } from './navigation.types';
import { routes } from './routes';
import PrivateNavigator from './PrivateNavigator';
import BottomMenu from '@/components/ui/layout/bottom_menu/BottonMenu';

const Stack = createNativeStackNavigator<TypeRootStackParamList>();

const Navigation: FC = () => {
    const navRef = useNavigationContainerRef();
    const [currentRoute, setCurrentRoute] = useState<keyof TypeRootStackParamList>(); // 👈 ИЗМЕНИТЕ ТУТ

    useEffect(() => {
        if (navRef.isReady()) {
            const routeName = navRef.getCurrentRoute()?.name;
            if (routeName) {
                setCurrentRoute(routeName as keyof TypeRootStackParamList); // 👈 ПРИВЕДЕНИЕ ТИПА
            }

            const listener = navRef.addListener('state', () => {
                const routeName = navRef.getCurrentRoute()?.name;
                if (routeName) {
                    setCurrentRoute(routeName as keyof TypeRootStackParamList);
                }
            });

            return () => {
                navRef.removeListener('state', listener);
            };
        }
    }, [navRef]);

    return (
        <>
            <NavigationContainer ref={navRef}>
                <PrivateNavigator />
            </NavigationContainer>
            {currentRoute && (
                <BottomMenu 
                    nav={navRef.navigate} 
                    currentRoute={currentRoute} // 👈 ТЕПЕРЬ ТИПЫ СОВПАДАЮТ
                />
            )}
        </>
    );
};

export default Navigation;
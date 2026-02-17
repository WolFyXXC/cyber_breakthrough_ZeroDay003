import { FC } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TypeRootStackParamList } from './navigation.types';
import { routes } from './routes';

const Stack = createNativeStackNavigator<TypeRootStackParamList>();

const PrivateNavigator: FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#fff' // Было '@fff' - это ошибка, нужно '#fff'
        }
      }}
    >
      {routes.map((route) => (
        <Stack.Screen 
          key={route.name} 
          name={route.name} 
          component={route.component} 
        />
      ))}
    </Stack.Navigator>
  );
};

export default PrivateNavigator;
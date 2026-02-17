// import Navigation from '@/navigation/Navigation';
// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import './global.css';
// import AuthProvider from '@/providers/auth/auth/Auth.provider';

// export default function App() {
//   return (
//     <>
//     <AuthProvider>
//     <SafeAreaProvider>
//         <Navigation/>
//     </SafeAreaProvider>
//     </AuthProvider>
//     <StatusBar style='light'/>
//     </>
//   );
// }

import { FC } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from '@/navigation/Navigation';

const App: FC = () => {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
};

export default App;

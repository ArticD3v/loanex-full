import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { MasterDataProvider } from './src/settings/context/MasterDataContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <MasterDataProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </MasterDataProvider>
    </SafeAreaProvider>
  );
}

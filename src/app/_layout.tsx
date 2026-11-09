import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/state/profile';
import { RoomProvider } from '@/net/RoomProvider';
import { theme } from '@/ui/kit';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <RoomProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
        </RoomProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/state/profile';
import { RoomProvider } from '@/net/RoomProvider';
import { colors } from '@/ui/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ LilitaOne_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bgBottom }} />;
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <RoomProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bgBottom },
              animation: 'fade_from_bottom',
            }}
          />
        </RoomProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/state/profile';
import { RoomProvider } from '@/net/RoomProvider';
import { FollowGame } from '@/room/FollowGame';
import { colors } from '@/ui/theme';

/**
 * On the web (the preview link), show the app inside a phone-sized frame whenever the
 * browser is wider than a phone, so it looks exactly like it will on a real device
 * instead of stretching to fill a desktop window. Phones are unaffected.
 */
const PHONE = { width: 390, height: 844 };

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= PHONE.width + 40) return <>{children}</>;
  // Real phone width; height shrinks only if the browser window is shorter than a phone.
  // (No CSS scaling: it breaks the web build's screen-transition animations.)
  const frameHeight = Math.min(PHONE.height, height - 40);
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0420', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: PHONE.width,
          height: frameHeight,
          borderRadius: 48,
          overflow: 'hidden',
          borderWidth: 10,
          borderColor: '#000',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </View>
      <Text style={{ position: 'absolute', bottom: 8, color: '#6E5A99', fontSize: 12 }}>Phone preview · 390 wide</Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ LilitaOne_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bgBottom }} />;
  return (
    <PhoneFrame>
    <SafeAreaProvider>
      <ProfileProvider>
        <RoomProvider>
          <StatusBar style="light" />
          <FollowGame />
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
    </PhoneFrame>
  );
}

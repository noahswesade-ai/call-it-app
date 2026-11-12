import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useRoom } from '@/net/RoomProvider';
import { Body, Button, H1, Screen, theme } from '@/ui/kit';
import { Logo } from '@/ui/Logo';

export default function Join() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const { joinRoom } = useRoom();
  const valid = /^[A-Z]{4}$/.test(code);

  const go = () => {
    if (!valid) return;
    joinRoom(code);
    router.replace({ pathname: '/room', params: { code } });
  };

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Logo width={150} style={{ alignSelf: 'center' }} />
      <H1 style={{ textAlign: 'center' }}>Join a game</H1>
      <Body style={{ textAlign: 'center' }}>Enter the 4-letter code on the host's phone.</Body>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4))}
        placeholder="ABCD"
        placeholderTextColor={theme.cardHi}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        style={styles.code}
        onSubmitEditing={go}
      />
      <Button label="Join" disabled={!valid} onPress={go} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    backgroundColor: theme.card,
    color: theme.accent,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 12,
    padding: 16,
    borderRadius: theme.radius,
    textAlign: 'center',
  },
});

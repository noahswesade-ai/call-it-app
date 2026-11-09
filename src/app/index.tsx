import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { useRoom } from '@/net/RoomProvider';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, Row, Screen, theme } from '@/ui/kit';

export default function Home() {
  const { profile, update, loaded } = useProfile();
  const { hostRoom, onlineAvailable } = useRoom();
  const [name, setName] = useState('');

  if (!loaded) return <Screen>{null}</Screen>;

  if (!profile.name) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <H1 style={{ textAlign: 'center' }}>Call It!</H1>
        <View style={{ alignItems: 'center' }}>
          <AnimalAvatar avatar={profile.avatar} size={150} mood="happy" />
        </View>
        <Body style={{ textAlign: 'center' }}>What should your friends call you?</Body>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.dim}
          maxLength={16}
          autoFocus
          style={styles.input}
          onSubmitEditing={() => name.trim() && update({ name: name.trim() })}
        />
        <Button label="Let's go" disabled={!name.trim()} onPress={() => update({ name: name.trim() })} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Call It!</H1>
        <Pressable onPress={() => router.push('/shop')} style={styles.tokens} accessibilityRole="button">
          <Text style={styles.tokensText}>🪙 {profile.tokens}</Text>
        </Pressable>
      </Row>

      <Pressable onPress={() => router.push('/avatar')} accessibilityRole="button">
        <Card style={{ alignItems: 'center' }}>
          <AnimalAvatar avatar={profile.avatar} size={140} mood="happy" />
          <Text style={styles.name}>
            {profile.premium ? '👑 ' : ''}
            {profile.name}
          </Text>
          <Dim>Tap to customize</Dim>
        </Card>
      </Pressable>

      <Button
        label="Host a game"
        icon="🎉"
        disabled={!onlineAvailable}
        onPress={() => {
          hostRoom({});
          router.push('/room');
        }}
      />
      <Button label="Join a game" icon="📲" variant="secondary" disabled={!onlineAvailable} onPress={() => router.push('/join')} />
      {!onlineAvailable && (
        <Dim style={{ textAlign: 'center' }}>
          Online play isn't set up yet (Supabase keys missing). Try practice mode below.
        </Dim>
      )}
      <Button
        label="Practice with bots"
        icon="🤖"
        variant="ghost"
        onPress={() => {
          hostRoom({ practiceBots: 4 });
          router.push('/room');
        }}
      />

      {!profile.premium && (
        <Pressable onPress={() => router.push('/paywall')} accessibilityRole="button">
          <Card style={{ backgroundColor: '#4A1F5C', borderWidth: 2, borderColor: theme.pink }}>
            <Text style={styles.premiumTitle}>🍻 Unlock Party mode</Text>
            <Dim>Sips & shots, Spicy questions, unlimited players, no ads, 2× tokens. One-time $4.99.</Dim>
          </Card>
        </Pressable>
      )}

      <Row style={{ justifyContent: 'center' }}>
        <Dim>
          Games played: {profile.gamesPlayed} · Wins: {profile.gamesWon}
        </Dim>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
    padding: 16,
    borderRadius: theme.radius,
    textAlign: 'center',
  },
  name: { color: theme.text, fontSize: 24, fontWeight: '900' },
  tokens: { backgroundColor: theme.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  tokensText: { color: theme.accent, fontWeight: '900', fontSize: 16 },
  premiumTitle: { color: theme.text, fontSize: 20, fontWeight: '900' },
});

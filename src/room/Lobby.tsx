import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { availableCategories, CATEGORIES, CATEGORY_BY_ID } from '@/content/categories';
import { canJoin, challengerPool, FREE_MAX_PLAYERS, FREE_ROUNDS, host, type GameState } from '@/game/engine';
import { notEveryoneWillPlay } from '@/game/selection';
import type { Category, GameSettings, Mode } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H2, Row, Segmented, Toggle, theme } from '@/ui/kit';
import { PlayerBadge } from './shared';

export function AgeGate({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBg}>
        <Card style={{ maxWidth: 420, width: '100%' }}>
          <H2>🍻 Party mode is for adults</H2>
          <Body>Please confirm you are of legal drinking age where you live.</Body>
          <Dim>Non-alcoholic drinks count too. Know your limits and drink responsibly.</Dim>
          <Button label="I'm of legal drinking age" onPress={onConfirm} />
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        </Card>
      </View>
    </Modal>
  );
}

export function Lobby({ state }: { state: GameState }) {
  const { isHost, dispatch, myId, connection, leaveRoom } = useRoom();
  const { profile, update } = useProfile();
  const [ageGateFor, setAgeGateFor] = useState<'party' | 'guest' | null>(null);
  const s = state.settings;
  const hostPlayer = host(state);
  const hostPremium = !!hostPlayer?.premium;
  const partyAllowed = hostPremium || !profile.partyTrialUsed;
  const me = state.players.find((p) => p.id === myId);

  const set = (patch: Partial<GameSettings>) => dispatch({ type: 'updateSettings', patch });

  const setMode = (mode: Mode) => {
    if (mode === 'party') {
      if (!partyAllowed) return router.push('/paywall');
      if (!profile.ageConfirmed) return setAgeGateFor('party');
    }
    applyMode(mode, s.spicy && mode === 'party');
  };
  const applyMode = (mode: Mode, spicy: boolean) => {
    const avail = availableCategories(mode, spicy);
    // Free hosts always have every category on; Premium keeps their toggles.
    const categories = hostPremium ? avail.filter((c) => s.categories.includes(c) || CATEGORY_BY_ID[c].partyOnly) : avail;
    set({ mode, spicy, categories });
  };

  const toggleCategory = (c: Category) => {
    if (!hostPremium) return router.push('/paywall');
    const on = s.categories.includes(c);
    if (on && s.categories.length <= 1) return;
    set({ categories: on ? s.categories.filter((x) => x !== c) : [...s.categories, c] });
  };

  const guestNeedsAgeGate = !isHost && s.mode === 'party' && !profile.ageConfirmed;
  const pool = challengerPool(state);
  const link = Linking.createURL('/join', { queryParams: { code: state.code } });

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ alignItems: 'center' }}>
        <Dim>{connection === 'practice' ? 'Practice game' : 'Room code'}</Dim>
        <Text style={styles.code}>{state.code}</Text>
        {connection !== 'practice' && (
          <Row>
            <Button small variant="secondary" label="Copy invite link" onPress={() => Clipboard.setStringAsync(link)} />
          </Row>
        )}
        {connection === 'broadcast' && (
          <Dim style={{ textAlign: 'center', fontSize: 13 }}>
            Test mode: open this app in another browser tab and join with this code.
          </Dim>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Players</H2>
          <Dim>
            {state.players.length}
            {hostPremium ? '' : ` / ${FREE_MAX_PLAYERS}`}
          </Dim>
        </Row>
        <View style={styles.players}>
          {state.players.map((p) => (
            <PlayerBadge key={p.id} player={p} size={56} label={p.isHost ? (p.playing ? 'Host' : 'Host · judging') : undefined} />
          ))}
        </View>
        {!canJoin(state) && isHost && (
          <Pressable onPress={() => router.push('/paywall')}>
            <Dim style={{ color: theme.accent }}>Room full. Premium hosts can have unlimited players →</Dim>
          </Pressable>
        )}
      </Card>

      {isHost ? (
        <Card>
          <H2>Game settings</H2>
          <Segmented<Mode>
            options={[
              { value: 'classic', label: 'Classic' },
              { value: 'party', label: hostPremium ? '🍻 Party' : partyAllowed ? '🍻 Party (free trial)' : '🔒 Party' },
            ]}
            value={s.mode}
            onChange={setMode}
          />
          {s.mode === 'party' && (
            <>
              <Toggle
                label="🌶️ Spicy questions"
                hint="Cheeky dating & confession challenges"
                value={s.spicy}
                onChange={(v) => applyMode('party', v)}
              />
              <Body>Loser drinks</Body>
              <Segmented<1 | 2 | 3>
                options={[
                  { value: 1, label: '1 sip' },
                  { value: 2, label: '2 sips' },
                  { value: 3, label: '3 sips' },
                ]}
                value={s.loserSips}
                onChange={(v) => set({ loserSips: v })}
              />
              <Toggle
                label="Final round: loser takes a shot"
                hint="Instead of double sips"
                value={s.finalShotRule}
                onChange={(v) => set({ finalShotRule: v })}
              />
            </>
          )}
          <Toggle
            label="I'm playing"
            hint="Off = you only host and judge"
            value={!!hostPlayer?.playing}
            onChange={(v) => dispatch({ type: 'setHostPlaying', playing: v })}
          />
          <Body>Rounds</Body>
          <Segmented<number>
            locked={!hostPremium}
            options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))}
            value={s.rounds}
            onChange={(n) => (hostPremium ? set({ rounds: n }) : n !== FREE_ROUNDS && router.push('/paywall'))}
          />
          {notEveryoneWillPlay(pool.length, s.rounds) && (
            <Dim>
              Not everyone will get a turn with {s.rounds} rounds and {pool.length} players.
            </Dim>
          )}
          <Body>Categories {hostPremium ? '' : '🔒'}</Body>
          <View style={styles.cats}>
            {CATEGORIES.filter((c) => availableCategories(s.mode, s.spicy).includes(c.id)).map((c) => {
              const on = s.categories.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCategory(c.id)}
                  style={[styles.cat, { borderColor: c.color, backgroundColor: on ? c.color : 'transparent' }]}
                >
                  <Text style={[styles.catText, on && { color: theme.ink }]}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : (
        <Card>
          <H2>{s.mode === 'party' ? `🍻 Party mode${s.spicy ? ' · 🌶️ Spicy' : ''}` : 'Classic mode'}</H2>
          <Dim>
            {s.rounds} rounds · waiting for {hostPlayer?.name ?? 'the host'} to start…
          </Dim>
        </Card>
      )}

      {isHost && (
        <Button
          label={pool.length < 2 ? 'Need at least 2 players' : 'Start game'}
          disabled={pool.length < 2}
          onPress={() => {
            if (s.mode === 'party' && !hostPremium) update({ partyTrialUsed: true });
            dispatch({ type: 'start', now: Date.now() });
          }}
        />
      )}
      <Button label="Leave" variant="ghost" onPress={() => { leaveRoom(); router.replace('/'); }} />

      <AgeGate
        visible={ageGateFor === 'party' || guestNeedsAgeGate}
        onConfirm={() => {
          update({ ageConfirmed: true });
          if (ageGateFor === 'party') applyMode('party', s.spicy);
          setAgeGateFor(null);
        }}
        onCancel={() => {
          setAgeGateFor(null);
          if (guestNeedsAgeGate) {
            leaveRoom();
            router.replace('/');
          }
        }}
      />
      {!me && <Dim style={{ textAlign: 'center' }}>Joining…</Dim>}
    </View>
  );
}

const styles = StyleSheet.create({
  code: { color: theme.accent, fontSize: 56, fontWeight: '900', letterSpacing: 10 },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 2, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  catText: { color: theme.text, fontWeight: '800', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
});

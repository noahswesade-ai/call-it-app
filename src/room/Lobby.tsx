import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { availableCategories, CATEGORIES, CATEGORY_BY_ID } from '@/content/categories';
import { canJoin, challengerPool, FREE_MAX_PLAYERS, FREE_ROUNDS, host, type GameState } from '@/game/engine';
import { notEveryoneWillPlay } from '@/game/selection';
import type { Category, GameSettings, Mode } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { canHostParty, DEV_UNLOCK_PARTY } from '@/state/access';
import { CategoryIcon } from '@/content/CategoryIcon';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H2, Row, Segmented, Toggle, tap } from '@/ui/kit';
import { Bob, PopIn, Pulse, SlideIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { PlayerBadge } from './shared';

export function AgeGate({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBg}>
        <PopIn>
          <View style={styles.gate}>
            <Text style={{ fontSize: 54, textAlign: 'center' }}>🍻</Text>
            <Text style={styles.gateTitle}>Party mode is 18+</Text>
            <Text style={styles.gateBody}>Please confirm you are of legal drinking age where you live.</Text>
            <Text style={styles.gateSmall}>Non-alcoholic drinks count too. Know your limits and drink responsibly.</Text>
            <Button label="I'm of legal drinking age" onPress={onConfirm} />
            <Button label="Cancel" variant="ghost" onPress={onCancel} />
          </View>
        </PopIn>
      </View>
    </Modal>
  );
}

/** "Waiting for host…" with bouncing dots. */
function WaitingDots({ text }: { text: string }) {
  return (
    <Row style={{ justifyContent: 'center', gap: 4 }}>
      <Text style={styles.waiting}>{text}</Text>
      {[0, 1, 2].map((i) => (
        <Bob key={i} amount={6} duration={350} delay={i * 120}>
          <Text style={styles.waiting}>•</Text>
        </Bob>
      ))}
    </Row>
  );
}

function RoomCode({ code, practice }: { code: string; practice: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.codeLabel}>{practice ? 'PRACTICE GAME' : 'ROOM CODE'}</Text>
      <Row style={{ gap: 6 }}>
        {code.split('').map((ch, i) => (
          <PopIn key={i} delay={i * 90}>
            <Bob amount={3} duration={1100} delay={i * 150}>
              <View style={[styles.codeTile, { transform: [{ rotate: `${(i % 2 ? 1 : -1) * 4}deg` }] }]}>
                <Text style={styles.codeChar}>{ch}</Text>
              </View>
            </Bob>
          </PopIn>
        ))}
      </Row>
    </View>
  );
}

/** Your own animal and name. Customizing happens here while waiting for the host. */
function YouCard() {
  const { profile, update } = useProfile();
  const [name, setName] = useState(profile.name);
  const [editing, setEditing] = useState(!profile.namedByUser);
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: profile.namedByUser ? 0 : 0.4 + ring.value * 0.6 }));

  const save = () => {
    const n = name.trim();
    if (n) update({ name: n, namedByUser: true });
    else setName(profile.name);
    setEditing(false);
  };

  return (
    <SlideIn from="bottom">
      <View style={styles.you}>
        <Pressable onPress={() => router.push('/avatar')} accessibilityRole="button" accessibilityLabel="Customize your avatar">
          <Bob amount={5} duration={900}>
            <AnimalAvatar avatar={profile.avatar} size={96} mood="happy" />
          </Bob>
          <View style={styles.editBadge}>
            <Text style={{ fontSize: 14 }}>🎨</Text>
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.youLabel}>THAT'S YOU!</Text>
          <View>
            <Animated.View style={[styles.nameRing, ringStyle]} pointerEvents="none" />
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={save}
                onSubmitEditing={save}
                maxLength={16}
                autoFocus={profile.namedByUser}
                selectTextOnFocus
                placeholder="Your name"
                placeholderTextColor="#8E7CC3"
                style={styles.nameInput}
              />
            ) : (
              <Pressable onPress={() => setEditing(true)} style={styles.nameStatic}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Text style={{ fontSize: 16 }}>✏️</Text>
              </Pressable>
            )}
          </View>
          <Button small variant="secondary" label="🎨 Customize avatar" onPress={() => router.push('/avatar')} />
        </View>
      </View>
    </SlideIn>
  );
}

export function Lobby({ state }: { state: GameState }) {
  const { isHost, dispatch, connection, leaveRoom } = useRoom();
  const { profile, update } = useProfile();
  const [ageGateFor, setAgeGateFor] = useState<'party' | null>(null);
  const s = state.settings;
  const hostPlayer = host(state);
  const hostPremium = !!hostPlayer?.premium;
  const partyAllowed = hostPremium || canHostParty(profile);

  const set = (patch: Partial<GameSettings>) => dispatch({ type: 'updateSettings', patch });

  const applyMode = (mode: Mode, spicy: boolean) => {
    const avail = availableCategories(mode, spicy);
    // Free hosts always have every category on; Premium keeps their toggles.
    const categories = hostPremium ? avail.filter((c) => s.categories.includes(c) || CATEGORY_BY_ID[c].partyOnly) : avail;
    set({ mode, spicy, categories });
  };
  const setMode = (mode: Mode) => {
    if (mode === 'party') {
      if (!partyAllowed) return router.push('/paywall');
      if (!profile.ageConfirmed) return setAgeGateFor('party');
    }
    applyMode(mode, s.spicy && mode === 'party');
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
  const ready = pool.length >= 2;

  return (
    <View style={{ gap: 16 }}>
      <RoomCode code={state.code} practice={connection === 'practice'} />
      {connection !== 'practice' && (
        <Row style={{ justifyContent: 'center' }}>
          <Button small variant="secondary" label="🔗 Copy invite link" onPress={() => Clipboard.setStringAsync(link)} />
        </Row>
      )}
      {connection === 'broadcast' && (
        <Dim style={{ textAlign: 'center', fontSize: 13 }}>Test mode: open another browser tab and join with this code.</Dim>
      )}

      <YouCard />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Players</H2>
          <Text style={styles.count}>
            {state.players.length}
            {hostPremium ? '' : ` / ${FREE_MAX_PLAYERS}`}
          </Text>
        </Row>
        <View style={styles.players}>
          {state.players.map((p, i) => (
            <PopIn key={p.id} delay={Math.min(i, 6) * 60}>
              <PlayerBadge player={p} size={58} bob label={p.isHost ? (p.playing ? '⭐ Host' : '⭐ Judging') : undefined} />
            </PopIn>
          ))}
        </View>
        {!canJoin(state) && isHost && (
          <Pressable onPress={() => router.push('/paywall')}>
            <Dim style={{ color: colors.gold }}>Room full. Premium hosts can have unlimited players →</Dim>
          </Pressable>
        )}
      </Card>

      {isHost ? (
        <SlideIn from="bottom" delay={150}>
          <Card style={s.mode === 'party' ? { borderColor: colors.neon, backgroundColor: 'rgba(42,10,74,0.75)' } : undefined}>
            <H2>Game settings</H2>
            <Segmented<Mode>
              options={[
                { value: 'classic', label: '🎉 Classic' },
                { value: 'party', label: hostPremium || DEV_UNLOCK_PARTY ? '🍻 Party' : partyAllowed ? '🍻 Party (1 free)' : '🔒 Party' },
              ]}
              value={s.mode}
              onChange={setMode}
            />
            {s.mode === 'party' && (
              <>
                <Toggle label="🌶️ Spicy questions" hint="Cheeky dating & confession challenges" value={s.spicy} onChange={(v) => applyMode('party', v)} />
                <View style={styles.sipRules}>
                  <Text style={styles.sipRulesText}>🍺 Wrong call or losing the face-off = 1 sip</Text>
                  <Text style={styles.sipRulesText}>🐶 Underdog wins = 3 sips · 🔥 Final round = ×2</Text>
                </View>
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
                    onPress={() => {
                      tap();
                      toggleCategory(c.id);
                    }}
                    style={[styles.cat, { borderColor: c.color, backgroundColor: on ? c.color : 'transparent' }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <CategoryIcon category={c.id} size={22} />
                      <Text style={[styles.catText, on && { color: colors.ink }]}>{c.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </SlideIn>
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <H2>{s.mode === 'party' ? `🍻 Party mode${s.spicy ? ' · 🌶️ Spicy' : ''}` : '🎉 Classic mode'}</H2>
          <Dim>{s.rounds} rounds</Dim>
          <WaitingDots text={`Waiting for ${hostPlayer?.name ?? 'the host'} to start`} />
        </Card>
      )}

      {isHost && (
        <Pulse active={ready} scale={1.03} duration={700}>
          <Button
            big
            variant="green"
            label={ready ? "▶ Let's Play!" : 'Waiting for players…'}
            disabled={!ready}
            onPress={() => {
              if (s.mode === 'party' && !hostPremium) update({ partyTrialUsed: true });
              dispatch({ type: 'start', now: Date.now() });
            }}
          />
        </Pulse>
      )}
      <Button
        label="Leave"
        variant="ghost"
        small
        onPress={() => {
          leaveRoom();
          router.replace('/');
        }}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  codeLabel: { color: colors.dim, fontFamily: fonts.display, fontSize: 15, letterSpacing: 2, marginBottom: 6 },
  codeTile: {
    width: 62,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: '#C9B8F0',
  },
  codeChar: { color: colors.ink, fontFamily: fonts.display, fontSize: 44 },
  you: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,201,60,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,201,60,0.5)',
    borderRadius: 24,
    padding: 14,
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  youLabel: { color: colors.gold, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1.5 },
  nameRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 14, borderWidth: 2.5, borderColor: colors.gold },
  nameInput: {
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nameStatic: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { color: colors.white, fontFamily: fonts.display, fontSize: 26, flexShrink: 1 },
  sipRules: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 10, gap: 2 },
  sipRulesText: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 14 },
  count: { color: colors.gold, fontFamily: fonts.display, fontSize: 20 },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 2.5, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  catText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  waiting: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(10,0,25,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  gate: {
    backgroundColor: colors.party,
    borderColor: colors.neon,
    borderWidth: 3,
    borderRadius: 28,
    padding: 22,
    gap: 12,
    maxWidth: 420,
    width: '100%',
  },
  gateTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 30, textAlign: 'center' },
  gateBody: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 17, textAlign: 'center' },
  gateSmall: { color: '#E9C9F5', fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
});

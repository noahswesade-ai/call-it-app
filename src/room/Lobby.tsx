import QRCode from 'react-native-qrcode-svg';
import { shareOrCopy } from '@/ui/share';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { availableCategories, CATEGORIES, CATEGORY_BY_ID } from '@/content/categories';
import { canJoin, challengerPool, CUSTOM_ONLY_MIN, customOnlyStatus, FREE_MAX_PLAYERS, FREE_ROUNDS, host, type GameState } from '@/game/engine';
import { notEveryoneWillPlay } from '@/game/selection';
import type { Category, GameSettings, Mode } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { canHostParty, DEV_UNLOCK_PARTY } from '@/state/access';
import { CategoryIcon } from '@/content/CategoryIcon';
import { onRelayStatus } from '@/net/relayTransport';
import { useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H2, Row, Segmented, Toggle, tap } from '@/ui/kit';
import { Bob, PopIn, Pulse, SlideIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { PlayerBadge } from './shared';
import { isBotId } from '@/net/RoomProvider';
import { AddQuestionButton, ModeTiles } from './LobbyExtras';
import { playSfx } from '@/ui/sound';
import { Icon, IconLabel } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';
import { openPremium } from '@/monetize/openPremium';

/**
 * Link that opens the Join screen with the room code filled in. On the web it keeps
 * the site's sub-path (e.g. /call-it-app on GitHub Pages), which expo-linking drops.
 */
export function inviteLink(code: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = window.location.pathname.replace(/\/(room|join|avatar|shop|paywall|welcome)?\/?$/, '');
    return `${window.location.origin}${base}/join?code=${code}`;
  }
  return Linking.createURL('/join', { queryParams: { code } });
}

/** Small "online" pill so it's obvious whether this phone can reach the game server. */
function RelayStatus() {
  const [online, setOnline] = useState(false);
  useEffect(() => onRelayStatus(setOnline), []);
  return (
    <Row style={{ justifyContent: 'center' }}>
      <View style={[styles.statusPill, { borderColor: online ? colors.green : colors.red }]}>
        <IconLabel icon="dot" size={14} color={online ? colors.green : colors.red} textStyle={styles.statusText}>{online ? 'Online — friends can join' : 'Connecting to the game server…'}</IconLabel>
      </View>
    </Row>
  );
}

/** Adults only: Party & Spicy. */
export const ADULT_AGE = 18;

/**
 * Neutral age check before Party / Spicy: asks for a birth year instead of a
 * "Yes, I'm old enough" button (FTC COPPA guidance on neutral age screens). An
 * under-age answer is remembered, so going back and retrying doesn't unlock it.
 */
export function AgeGate({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { profile, update } = useProfile();
  const [year, setYear] = useState('');
  const thisYear = new Date().getFullYear();
  const y = Number(year);
  const valid = /^\d{4}$/.test(year) && y > thisYear - 120 && y <= thisYear;
  const tooYoung = profile.birthYear !== undefined && thisYear - profile.birthYear < ADULT_AGE;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBg}>
        <PopIn>
          <View style={styles.gate}>
            <Text style={{ fontSize: 54, textAlign: 'center' }}>🍻</Text>
            {tooYoung ? (
              <>
                <Text style={styles.gateTitle}>Party mode is for adults</Text>
                <Text style={styles.gateBody}>Classic mode is all yours: trivia, challenges and bragging rights.</Text>
                <Button label="Back" onPress={onCancel} />
              </>
            ) : (
              <>
                <Text style={styles.gateTitle}>Party mode is {ADULT_AGE}+</Text>
                <Text style={styles.gateBody}>What year were you born?</Text>
                <TextInput
                  value={year}
                  onChangeText={(t) => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="YYYY"
                  placeholderTextColor="#8A84A6"
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.yearInput}
                  accessibilityLabel="Birth year"
                />
                <Text style={styles.gateSmall}>
                  Only drink alcohol if you're of legal drinking age where you live. Any drink counts, non-alcoholic too. Know your limits.
                </Text>
                <Button
                  label="Continue"
                  disabled={!valid}
                  onPress={() => {
                    const adult = thisYear - y >= ADULT_AGE;
                    update({ birthYear: y, ...(adult ? { ageConfirmed: true } : {}) });
                    setYear('');
                    if (adult) onConfirm();
                  }}
                />
                <Button label="Cancel" variant="ghost" onPress={onCancel} />
              </>
            )}
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
      <Logo width={84} style={{ marginBottom: 2 }} />
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
            <Icon name="palette" size={14} color={colors.ink} />
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
                placeholderTextColor="#8A84A6"
                style={styles.nameInput}
              />
            ) : (
              <Pressable onPress={() => setEditing(true)} style={styles.nameStatic}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {profile.name}
                </Text>
                <Icon name="edit" size={16} color={colors.dim} />
              </Pressable>
            )}
          </View>
          <Button small variant="secondary" icon="palette" label="Customize avatar" onPress={() => router.push('/avatar')} />
        </View>
      </View>
    </SlideIn>
  );
}

/** Host only: hand hosting to another player (in "More settings"). */
function HandOver({
  state,
  myId,
  target,
  onPick,
  onConfirm,
}: {
  state: GameState;
  myId: string;
  target?: { id: string; name: string };
  onPick: (t?: { id: string; name: string }) => void;
  onConfirm: () => void;
}) {
  const others = state.players.filter((p) => p.id !== myId && !isBotId(p.id) && p.connected !== false);
  if (others.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <IconLabel icon="crown" textStyle={{ color: colors.white, fontSize: 16, fontFamily: fonts.bodySemi }}>Make someone else the host</IconLabel>
      {target ? (
        <View style={styles.handConfirm}>
          <Text style={styles.gateBody}>Make {target.name} the host? You'll stay in the game as a player.</Text>
          <Row>
            <Button style={{ flex: 1 }} small variant="ghost" label="Cancel" onPress={() => onPick(undefined)} />
            <Button style={{ flex: 1 }} small variant="green" label={`Yes, ${target.name}`} onPress={onConfirm} />
          </Row>
        </View>
      ) : (
        <View style={styles.cats}>
          {others.map((p) => (
            <Pressable key={p.id} onPress={() => onPick({ id: p.id, name: p.name })} style={styles.handChip} accessibilityRole="button" accessibilityLabel={`Make ${p.name} the host`}>
              <AnimalAvatar avatar={p.avatar} size={26} mood="happy" />
              <Text style={styles.catText}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function Lobby({ state }: { state: GameState }) {
  const { isHost, dispatch, connection, leaveRoom, myId } = useRoom();
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string }>();
  const [inviteMsg, setInviteMsg] = useState<string>();
  const [showQr, setShowQr] = useState(false);
  const { profile, update } = useProfile();
  const [ageGateFor, setAgeGateFor] = useState<'party' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const s = state.settings;
  const hostPlayer = host(state);
  const hostPremium = !!hostPlayer?.premium;
  const partyAllowed = hostPremium || canHostParty(profile);

  const set = (patch: Partial<GameSettings>) => dispatch({ type: 'updateSettings', patch });

  const applyMode = (mode: Mode, spicy: boolean) => {
    const avail = availableCategories(mode, spicy);
    // Free hosts always have every category on; Premium keeps their toggles.
    const categories = hostPremium ? avail.filter((c) => s.categories.includes(c) || CATEGORY_BY_ID[c].partyOnly) : avail;
    if (s.onlyCustom && !customOnlyStatus(state, categories).ready) {
      setOnlyWarn(customOnlyStatus(state, categories).short);
      return set({ mode, spicy, categories, onlyCustom: false });
    }
    set({ mode, spicy, categories });
  };
  const setMode = (mode: Mode) => {
    if (mode === 'party') {
      if (!partyAllowed) return openPremium('party');
      if (!profile.ageConfirmed) return setAgeGateFor('party');
    }
    applyMode(mode, s.spicy && mode === 'party');
  };
  const toggleCategory = (c: Category) => {
    if (!hostPremium) return openPremium('categories');
    const on = s.categories.includes(c);
    if (on && s.categories.length <= 1) return;
    const categories = on ? s.categories.filter((x) => x !== c) : [...s.categories, c];
    // Adding a category the lobby hasn't written 10 questions for switches "only ours" off.
    if (s.onlyCustom && !customOnlyStatus(state, categories).ready) {
      setOnlyWarn(customOnlyStatus(state, categories).short);
      return set({ categories, onlyCustom: false });
    }
    set({ categories });
  };
  const [onlyWarn, setOnlyWarn] = useState<{ category: Category; count: number }[]>();
  const setOnlyCustom = (v: boolean) => {
    if (!hostPremium) return openPremium('custom');
    if (!v) return set({ onlyCustom: false });
    const st = customOnlyStatus(state);
    if (!st.ready) return setOnlyWarn(st.short);
    set({ onlyCustom: true });
  };
  const [handTo, setHandTo] = useState<{ id: string; name: string }>();

  // Spicy can only be on in Party mode: switching it on turns Party on too.
  const setSpicy = (v: boolean) => {
    if (!v) return applyMode(s.mode, false);
    if (!partyAllowed) return openPremium('spicy');
    if (!profile.ageConfirmed) {
      setPendingSpicy(true);
      return setAgeGateFor('party');
    }
    applyMode('party', true);
  };
  const [pendingSpicy, setPendingSpicy] = useState(false);

  // A little pop whenever someone new joins.
  const prevCount = useRef(state.players.length);
  useEffect(() => {
    if (state.players.length > prevCount.current) playSfx('pop');
    prevCount.current = state.players.length;
  }, [state.players.length]);

  const guestNeedsAgeGate = !isHost && s.mode === 'party' && !profile.ageConfirmed;
  const pool = challengerPool(state);
  const link = inviteLink(state.code);
  const ready = pool.length >= 2;

  return (
    <View style={{ gap: 16 }}>
      <RoomCode code={state.code} practice={connection === 'practice'} />
      {connection !== 'practice' && (
        <Row style={{ justifyContent: 'center', gap: 8 }}>
          <Button
            small
            variant="secondary"
            icon={inviteMsg ? 'check' : 'share'}
            label={inviteMsg ?? 'Invite friends'}
            onPress={async () => {
              const r = await shareOrCopy(`Join my Underdog game! Code ${state.code}. No download needed:`, link);
              setInviteMsg(r === 'copied' ? 'Link copied!' : r === 'shared' ? 'Invite sent' : undefined);
              setTimeout(() => setInviteMsg(undefined), 2500);
            }}
          />
          <Button small variant="secondary" icon="qr" label="QR code" onPress={() => setShowQr(true)} />
        </Row>
      )}
      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowQr(false)} accessibilityLabel="Close QR code">
          <PopIn>
            <View style={styles.qrCard}>
              <Text style={styles.gateTitle}>Scan to join</Text>
              <View style={styles.qrWhite}>
                <QRCode value={link} size={220} />
              </View>
              <Text style={styles.gateBody}>Point a phone camera here. Friends play in the browser, no download needed.</Text>
              <Text style={styles.gateSmall}>Tap anywhere to close</Text>
            </View>
          </PopIn>
        </Pressable>
      </Modal>
      {connection === 'relay' && <RelayStatus />}
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
              <Pressable
                disabled={!isHost || p.id === myId}
                accessibilityLabel={isHost && p.id !== myId ? `Remove ${p.name}` : undefined}
                onPress={() => {
                  tap('light');
                  setKickTarget({ id: p.id, name: p.name });
                }}
              >
                <PlayerBadge player={p} size={58} bob label={p.isHost ? (p.playing ? '⭐ Host' : '⭐ Judging') : undefined} />
              </Pressable>
            </PopIn>
          ))}
        </View>
        {isHost && state.players.length > 1 && <Dim style={{ fontSize: 12, textAlign: 'center' }}>Tap a player to remove them</Dim>}
        {!canJoin(state) && isHost && (
          <Pressable onPress={() => openPremium('players')}>
            <Dim style={{ color: colors.gold }}>Room full. Premium hosts can have unlimited players →</Dim>
          </Pressable>
        )}
      </Card>

      {isHost ? (
        <SlideIn from="bottom" delay={150}>
          <Card style={s.mode === 'party' ? { borderColor: colors.neon, backgroundColor: 'rgba(42,10,74,0.75)' } : undefined}>
            <H2>Game settings</H2>
            <ModeTiles
              party={s.mode === 'party'}
              spicy={s.spicy}
              locked={!partyAllowed}
              premiumLock={!hostPremium}
              interactive
              onParty={(v) => setMode(v ? 'party' : 'classic')}
              onSpicy={setSpicy}
              onLocked={() => openPremium('party')}
            />
            {s.mode === 'party' && (
              <View style={styles.sipRules}>
                <Text style={styles.sipRulesText}>🍺 Wrong call or losing the face-off = 1 sip</Text>
                <Text style={styles.sipRulesText}>🐶 Underdog wins = 3 sips · 🔥 Final round = ×2</Text>
              </View>
            )}
            <Row style={{ justifyContent: 'space-between' }}>
              <Dim style={{ flex: 1 }}>
                {s.rounds} rounds · {s.categories.length} categories{s.mode === 'party' && s.spicy ? ' · 🌶️ Spicy' : ''}
                {!hostPlayer?.playing ? ' · you only judge' : ''}
              </Dim>
              <Button small variant="secondary" icon="settings" label="More settings" onPress={() => setShowSettings(true)} />
            </Row>
          </Card>
        </SlideIn>
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <ModeTiles party={s.mode === 'party'} spicy={s.spicy} locked={s.mode !== 'party' && !profile.premium} interactive={false} onLocked={() => openPremium('party')} />
          <Dim>{s.rounds} rounds{s.mode !== 'party' && !profile.premium ? ' · Tap a lock to see Premium' : ''}</Dim>
          <WaitingDots text={`Waiting for ${hostPlayer?.name ?? 'the host'} to start`} />
        </Card>
      )}

      <AddQuestionButton state={state} />

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
      <Modal visible={!!kickTarget} transparent animationType="fade" onRequestClose={() => setKickTarget(undefined)}>
        <View style={styles.modalBg}>
          <PopIn>
            <View style={styles.gate}>
              <Text style={styles.gateTitle}>Remove {kickTarget?.name} from the lobby?</Text>
              <Row>
                <Button style={{ flex: 1 }} variant="green" label="Keep them" onPress={() => setKickTarget(undefined)} />
                <Button
                  style={{ flex: 1 }}
                  variant="danger"
                  label="Remove"
                  onPress={() => {
                    if (kickTarget) dispatch({ type: 'kick', playerId: kickTarget.id });
                    setKickTarget(undefined);
                  }}
                />
              </Row>
            </View>
          </PopIn>
        </View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.sheetBg}>
          <View style={styles.sheet}>
           <ScrollView contentContainerStyle={{ gap: 10 }}>
            <IconLabel icon="settings" size={20} textStyle={{ color: colors.white, fontSize: 20, fontFamily: fonts.display }}>Game settings</IconLabel>
            <Toggle
              icon="write"
              label="Only our questions"
              hint={`Play with only the lobby's own questions. Needs at least ${CUSTOM_ONLY_MIN} in every selected category.`}
              locked={!hostPremium}
              value={!!s.onlyCustom}
              onChange={setOnlyCustom}
            />
            <Toggle
              label="I'm playing"
              hint="Off = you only host and judge"
              value={!!hostPlayer?.playing}
              onChange={(v) => dispatch({ type: 'setHostPlaying', playing: v })}
            />
            <Body>Betting time</Body>
            <Segmented<number>
              options={[30, 45, 60].map((n) => ({ value: n, label: `${n}s` }))}
              value={s.betSeconds ?? 30}
              onChange={(n) => set({ betSeconds: n })}
            />
            <Dim style={{ fontSize: 12, marginTop: -4 }}>Longer gives everyone time to think (betting ends early once everyone has called it).</Dim>
            <Body>Rounds</Body>
            <Segmented<number>
              locked={!hostPremium}
              options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))}
              value={s.rounds}
              onChange={(n) => (hostPremium ? set({ rounds: n }) : n !== FREE_ROUNDS && openPremium('rounds'))}
            />
            {notEveryoneWillPlay(pool.length, s.rounds) && (
              <Dim>
                Not everyone will get a turn with {s.rounds} rounds and {pool.length} players.
              </Dim>
            )}
            <Row style={{ gap: 6 }}>
              <Body>Categories</Body>
              {hostPremium ? null : <Icon name="lock" size={15} color={colors.gold} />}
            </Row>
            <View style={styles.cats}>
              {CATEGORIES.filter((c) => availableCategories(s.mode, s.spicy).includes(c.id)).map((c) => {
                const on = s.categories.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on }}
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
            <HandOver state={state} myId={myId} target={handTo} onPick={setHandTo} onConfirm={() => {
              if (handTo) dispatch({ type: 'transferHost', to: handTo.id });
              setHandTo(undefined);
              setShowSettings(false);
            }} />
            <Button label="Done" onPress={() => setShowSettings(false)} />
           </ScrollView>
            {onlyWarn && (
              <View style={styles.warnWrap}>
                <PopIn>
                  <View style={styles.gate}>
                    <Text style={{ fontSize: 44, textAlign: 'center' }}>✍️</Text>
                    <Text style={[styles.gateTitle, { fontSize: 24 }]}>Not enough of your own questions yet</Text>
                    <Text style={styles.gateBody}>
                      "Only our questions" needs at least {CUSTOM_ONLY_MIN} of the lobby's own questions in every selected category, so it can't be turned on yet.
                    </Text>
                    {onlyWarn.map((x) => (
                      <Text key={x.category} style={styles.gateSmall}>
                        {CATEGORY_BY_ID[x.category]?.emoji} {CATEGORY_BY_ID[x.category]?.label}: {x.count} / {CUSTOM_ONLY_MIN}
                      </Text>
                    ))}
                    <Text style={styles.gateSmall}>Add more questions (or bring yours from "My questions"), or turn off the categories that are short.</Text>
                    <Button label="Got it" onPress={() => setOnlyWarn(undefined)} />
                  </View>
                </PopIn>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <AgeGate
        visible={ageGateFor === 'party' || guestNeedsAgeGate}
        onConfirm={() => {
          update({ ageConfirmed: true });
          if (ageGateFor === 'party') applyMode('party', pendingSpicy || s.spicy);
          setPendingSpicy(false);
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
  statusPill: { borderWidth: 2, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  statusText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13 },
  sipRules: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 10, gap: 2 },
  sipRulesText: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 14 },
  count: { color: colors.gold, fontFamily: fonts.display, fontSize: 20 },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 2.5, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  catText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  waiting: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 16 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(10,0,25,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#2A0E55', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '92%', maxWidth: 560, width: '100%', alignSelf: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(10,0,25,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  qrCard: { backgroundColor: '#2A0E55', borderColor: colors.gold, borderWidth: 3, borderRadius: 28, padding: 22, gap: 12, alignItems: 'center', maxWidth: 380 },
  qrWhite: { backgroundColor: colors.white, padding: 14, borderRadius: 18 },
  warnWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,0,25,0.85)', borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'center', justifyContent: 'center', padding: 14 },
  handChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: colors.gold, borderRadius: 99, paddingLeft: 4, paddingRight: 12, paddingVertical: 3 },
  handConfirm: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 10, gap: 8 },
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
  yearInput: {
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 30,
    textAlign: 'center',
    letterSpacing: 6,
    borderRadius: 14,
    paddingVertical: 8,
    alignSelf: 'center',
    width: 170,
  },
  gateTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 30, textAlign: 'center' },
  gateBody: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 17, textAlign: 'center' },
  gateSmall: { color: '#E9C9F5', fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
});

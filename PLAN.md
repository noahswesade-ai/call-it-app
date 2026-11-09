# Head-to-Head Party Game — Full App Plan (v2)
*(Based on your three notebook pages plus your answers to three rounds of questions, 2026-11-09.)*

## Context
You want a phone-based party game for the App Store and Google Play. Everyone joins from their own phone. In each round two players face off in a challenge picked by a spinning wheel, and everyone else bets on who will win. There's a free **Classic** mode and a paid **Party** mode where bets are made in sips. The aim of this plan is that coding can start with almost nothing left to decide.

**Your decisions so far:**
- **You:** little coding experience → a simple, managed tech stack.
- **Platforms:** iOS and Android.
- **Premium:** a one-time unlock for **$4.99**.
- **Trivia answers:** spoken out loud. The host's phone keeps the answer hidden until the host taps *Reveal*.
- **Host:** plays by default. A lobby toggle switches to "just hosting."
- **Wheel:** shows the category and the difficulty.
- **Drinks:** 1 sip per wrong bet, rising to 2 or 3 only for severe upsets. **No Vote = 1 sip.** The host sets the loser's sips (1–3) in the lobby.
- **Rounds:** free games are fixed at 10. Premium hosts choose any number, even if that means not everyone plays.
- **Accounts:** play instantly with an anonymous profile. Sign-in is optional.
- **Adult content:** two tiers: Party (cheeky) and an opt-in **Spicy** toggle.
- **Avatars:** chunky round "blob" cartoon **animals**, drawn as SVG in code first and replaceable with polished art later. Free animals: **Cat, Dog, Frog, Bear**.
- **Ads:** decided per person. Premium accounts never see ads. A Premium host does *not* remove ads for other players.
- **v1 additions:** the categories **Phone Mini-Games**, **Know Your Friends**, **Pop Culture** and **Sports**; the mechanics **Underdog bonus points**, **Final round double** and **Picture questions**.

---

## 1. Game flow

### Lobby
1. The host taps *Create Game* and gets a 4-letter code, a QR code and a share link.
2. Guests join and set a name and animal avatar. These are saved on the device, so next time joining is one tap.
3. Host settings:
   - Mode: Classic or Party (with the Spicy sub-toggle).
   - "I'm playing" toggle (on by default).
   - Loser sips, 1–3 (Party only).
   - Premium only: number of rounds, category toggles, custom packs.
4. The host taps *Start*.

### Round phases (the same on every phone)
| Phase | Host phone | Challenger phones | Bettor phones | Time |
|---|---|---|---|---|
| `MATCHUP` | VS animation of the two avatars | "You're up!" | VS animation | 4s |
| `SPIN` | The wheel spins and lands on, for example, **Geography · Hard** | same | same | 5s |
| `BETTING` | Live count of how many have voted (not who they picked) | "Bets are coming in…" | Pick A / Pick B / **No Vote**. Ends after 30s or when all have voted. The **last 10s turn red with a ticking sound and haptic pulses** | ≤30s |
| `BETS_REVEAL` | Avatars stacked under each challenger, with the % split | same | same | 4s |
| `CHALLENGE` | Full question. For trivia, the answer is **hidden behind a "Reveal answer" button**. After tapping it, an optional *Show on all screens* button appears | Question only | Question only | open |
| `JUDGING` | Tap the winner, or *Draw* | waiting | waiting | — |
| `RESULT` | Summary of the round | WIN / LOSS (or DRINK × n) | WIN +n / LOSS (or DRINK × n) | 5s |

After the last round: podium, full rankings, fun awards, a share card, tokens earned, then ads for players without Premium.

### Who judges
- **Normal case:** the host.
- **Host is a challenger:** a random bettor becomes judge for that round and gets the hidden answer and the Reveal button.
- **Know Your Friends:** the *subject* player judges (§4).
- **Phone Mini-Games:** the app judges automatically.
- **Override:** the host can change any result.

### Edge cases
- **Draw:** nobody scores. In Party mode both challengers drink the loser amount.
- **A challenger disconnects:** the host chooses *Skip round* or *Swap in another player*.
- **The host leaves:** host status passes to the next player who joined. The game state is saved in the database, so play continues.
- **Late joiners** can enter between rounds. Their earlier rounds count as 0.

---

## 2. Scoring and drinks

**Underdog %** is the share of bettors who backed the eventual winner, counting only non-abstaining bettors. **Multipliers only apply when at least 4 bettors voted**; with fewer, everything is 1×.

| Event | Points (both modes) | Sips (Party) |
|---|---|---|
| Challenger wins | +1 | — |
| Challenger loses | 0 | Host setting (1–3) |
| Correct bet, winner had >25% of votes | +1 | — |
| Correct bet, winner had ≤25% | **+2** (underdog bonus) | — |
| Correct bet, winner had ≤10% | **+3** | — |
| Wrong bet, winner had >25% | 0 | 1 |
| Wrong bet, winner had ≤25% | 0 | **2** |
| Wrong bet, winner had ≤10% | 0 | **3** |
| No Vote | 0 | 1 |
| **Final round** | all points ×2 | all sips ×2 |

**"Shots":** the host can turn on a *"Final round: loser takes a shot"* house rule instead of doubling sips. It is **off by default**.

---

## 3. Fair player selection
- **Weights:** each player has weight `1 / (1 + timesChosen)²`. Pick A and B by weighted random; they can't be the same person.
- **Guarantee everyone plays (when possible):** if `2 × roundsLeft ≤ number of players not yet chosen`, pick only from those players. Free games (≤10 players, 10 rounds) can always cover everyone.
- **Premium hosts may choose too few rounds:** the guarantee is dropped. The weights still favour players who haven't played. The lobby shows a gentle note: "Not everyone will get a turn with 6 rounds and 18 players."
- **Soft rules:** avoid repeating the same pair, and avoid back-to-back turns when there's another option.
- **Spectating host:** if the host is just hosting, they are left out of the pool.
- **Know Your Friends:** also picks a **subject** from players other than the challengers, using the same weights.
- **Tests:** unit tests simulate 10,000 games for 3–30 players.

---

## 4. Categories, question types and the question bank

**Question types** (each item is tagged with one):
- `SPOKEN_EXACT`: one correct answer. The host reveals it and picks who said it first or correctly.
- `SPOKEN_CLOSEST`: a number answer. Both challengers say their answer, the host reveals the true number, and the closer one wins.
- `TURN_BASED`: the challengers alternate answers until someone repeats one, stalls about 5s, or gets one wrong. The host's phone has a 5s "stall" timer button.
- `HOST_JUDGED`: physical or party challenges.
- `SUBJECT_JUDGED`: Know Your Friends.
- `MINIGAME`: played on the phone and scored by the app.
- `PICTURE`: shown on every phone; can be combined with exact or closest.

Difficulty: **E**asy / **M**edium / **H**ard, shown on the wheel.

**Wheel slices:**
- **Classic:** Geography, History, Basic Knowledge, Pop Culture, Sports, Physical, Mini-Games, Know Your Friends, Random.
- **Party:** adds Party slices, plus Spicy when that toggle is on.
- **Free users** see the Party slice greyed out with a 🔒 (a constant, gentle upsell).

Answers marked † are approximate or change over time. **Check everything once more before launch.**

### Trivia — Geography
1. Which river is the longest in the world? — Nile (accept the Amazon; it's disputed) [EXACT, M]
2. What is the population of India? — about 1.45 billion† [CLOSEST, M]
3. What's the capital of Australia? — Canberra [EXACT, E]
4. Which country has the most time zones (overseas territories included)? — France (12) [EXACT, H]
5. What's the smallest country in the world? — Vatican City [EXACT, E]
6. How tall is Mount Everest, in meters? — 8,849 [CLOSEST, M]
7. How many countries are in Africa? — 54 [CLOSEST, M]
8. Which US state has the longest coastline? — Alaska [EXACT, M]
9. What's the deepest point in the ocean? — Mariana Trench (Challenger Deep) [EXACT, E]
10. What's the largest desert on Earth? — Antarctica (the Sahara is the largest *hot* desert) [EXACT, H]
11. How many US states border Canada? — 13 [CLOSEST, H]
12. What's the most populous country in South America? — Brazil [EXACT, E]
13. What's the straight-line distance from New York to Los Angeles, in miles? — about 2,450 [CLOSEST, H]
14. Name the countries that border Germany, taking turns (9 in total) [TURN, H]
15. Name countries in Europe, taking turns, until someone repeats or stalls [TURN, M]
16. What's the capital of Canada? — Ottawa [EXACT, E]

### Trivia — History
1. In what year did the Industrial Revolution begin? — about 1760 [CLOSEST, M]
2. Which American town is famous for its witch trials? — Salem [EXACT, E]
3. In what year did the Titanic sink? — 1912 [CLOSEST, E]
4. Who was the first person to walk on the Moon? — Neil Armstrong [EXACT, E]
5. In what year did the Berlin Wall fall? — 1989 [CLOSEST, M]
6. How many years did the Hundred Years' War actually last? — 116 [CLOSEST, H]
7. Who was the 16th US president? — Abraham Lincoln [EXACT, E]
8. In what year did Columbus first reach the Americas? — 1492 [CLOSEST, E]
9. Which civilization built Machu Picchu? — the Inca [EXACT, M]
10. In what year did World War II end? — 1945 [CLOSEST, E]
11. Who was the first woman to win a Nobel Prize? — Marie Curie [EXACT, M]
12. Which of the Seven Wonders of the Ancient World is still standing? — the Great Pyramid of Giza [EXACT, M]
13. How many wives did Henry VIII have? — 6 [CLOSEST, E]
14. In what year was the US Declaration of Independence adopted? — 1776 [CLOSEST, E]
15. Which country gave the Statue of Liberty to the US? — France [EXACT, E]
16. Name US presidents, taking turns, until someone repeats or stalls [TURN, M]

### Trivia — Basic Knowledge
1. What's the fastest land animal? — Cheetah [EXACT, E]
2. How much does a blue whale's heart weigh, in kg? — about 180† [CLOSEST, H]
3. Name capital cities, taking turns, until someone repeats or stalls [TURN, M]
4. How many bones are in the adult human body? — 206 [CLOSEST, M]
5. What's the chemical symbol for gold? — Au [EXACT, M]
6. How many hearts does an octopus have? — 3 [EXACT, M]
7. What's the boiling point of water in °F? — 212 [CLOSEST, E]
8. What's the largest planet in our solar system? — Jupiter [EXACT, E]
9. How many minutes are in a week? — 10,080 [CLOSEST, M]
10. What's the hardest natural substance? — Diamond [EXACT, E]
11. How many keys are on a standard piano? — 88 [CLOSEST, M]
12. What's the speed of light, in km per second? — about 300,000 (299,792) [CLOSEST, H]
13. Which gas do plants take in from the air? — Carbon dioxide [EXACT, E]
14. How many teaspoons are in a tablespoon? — 3 [EXACT, M]
15. Name animals starting with "B", taking turns [TURN, E]
16. How many legs does a spider have? — 8 [EXACT, E]

### Pop Culture
1. Which TV show features "the Upside Down"? — Stranger Things [EXACT, E]
2. How many main Harry Potter books are there? — 7 [EXACT, E]
3. What's the highest-grossing film of all time, not adjusted for inflation? — Avatar (2009)† [EXACT, M]
4. Who released the album *1989*? — Taylor Swift [EXACT, E]
5. How many seasons did *Friends* run? — 10 [CLOSEST, M]
6. In what year did the first iPhone come out? — 2007 [CLOSEST, M]
7. Who played Jack in *Titanic*? — Leonardo DiCaprio [EXACT, E]
8. Which band was Harry Styles in? — One Direction [EXACT, E]
9. What's the name of the coffee shop in *Friends*? — Central Perk [EXACT, M]
10. How many Oscars did *Titanic* win? — 11 [CLOSEST, H]
11. Which video game series stars Master Chief? — Halo [EXACT, M]
12. What's the name of Shrek's wife? — Fiona [EXACT, E]
13. Which streaming service released *Squid Game*? — Netflix [EXACT, E]
14. In what year did YouTube launch? — 2005 [CLOSEST, M]
15. Name Marvel superheroes, taking turns [TURN, E]
16. Name Pixar movies, taking turns [TURN, M]

### Sports
1. How many players does a soccer team have on the field? — 11 [EXACT, E]
2. Which country has won the most men's FIFA World Cups? — Brazil (5) [EXACT, M]
3. How many rings are on the Olympic flag? — 5 [EXACT, E]
4. What was Michael Jordan's famous jersey number? — 23 [EXACT, E]
5. How long is a marathon, in miles? — 26.2 [CLOSEST, M]
6. What is Usain Bolt's 100m world record time? — 9.58s [CLOSEST, H]
7. Which sport uses a shuttlecock? — Badminton [EXACT, E]
8. How many points is a touchdown worth? — 6 [EXACT, E]
9. How many holes are in a standard round of golf? — 18 [EXACT, E]
10. Which city hosted the 2016 Summer Olympics? — Rio de Janeiro [EXACT, M]
11. What's a perfect score in ten-pin bowling? — 300 [CLOSEST, M]
12. How many players does a baseball team have on the field? — 9 [EXACT, E]
13. How many Grand Slam singles titles has Novak Djokovic won? — 24† [CLOSEST, H]
14. How many minutes long is an NBA game, not counting overtime? — 48 [CLOSEST, M]
15. Name NBA teams, taking turns [TURN, M]
16. Name Premier League clubs, taking turns [TURN, M]

### Physical Challenge (host judges)
1. Most push-ups in 30 seconds
2. Hold your breath the longest
3. Rock, Paper, Scissors, best of 3
4. Longest wall sit
5. Longest plank
6. Stand on one leg with your eyes closed the longest
7. Thumb war, best of 3
8. Most jumping jacks in 30 seconds
9. Staring contest: first to blink loses
10. Balance a spoon on your nose the longest
11. Say the alphabet backwards the fastest
12. Tongue twister three times fast, fewest mistakes
13. Most squats in 30 seconds
14. Hop on one foot the longest
15. Bottle flip: first to land one
16. Stack the most coins in 30 seconds

### Phone Mini-Games (app judges; both challengers play at the same time)
**v1 ships the first 6**; the rest arrive as post-launch updates.
1. **Reaction Tap:** tap the instant the screen turns green. Tapping early loses.
2. **Tap Frenzy:** most taps in 10s.
3. **Stop the Clock:** stop a hidden timer as close to 5.00s as you can.
4. **Color Clash:** tap the *ink color*, not the word. Most correct in 20s.
5. **Quick Math:** most sums solved in 20s.
6. **Memory Sequence:** repeat a growing color pattern. The longer sequence wins.
7. **Steady Hand:** tilt the phone to keep a ball in the center circle.
8. **Shake It:** most shakes in 10s, measured by the accelerometer.
9. **Odd One Out:** find the different emoji in a grid, fastest.
10. **Count the Dots:** a grid of dots flashes for 1s; the closer count wins.
11. **Number Hunt:** tap 1–25 in order on a scrambled grid.
12. **Swipe Storm:** swipe in the direction of each arrow; most in 15s.
13. **Balloon Pump:** pump as close to bursting as you dare. Popping it loses.
14. **Type Race:** type a short phrase the fastest, with no typos.
15. **Hold Still:** keep the phone motionless for 10s; the steadiest wins.
16. **Trace It:** trace a squiggly path the most accurately.

### Know Your Friends (`{S}` = the subject player, who secretly types the true answer on their phone first and then judges)
1. What's {S}'s favorite food?
2. What's {S}'s go-to drink order?
3. Which month is {S}'s birthday in?
4. What's {S}'s dream travel destination?
5. What's {S}'s middle name?
6. What's {S}'s biggest fear?
7. Which celebrity would {S} most want to meet?
8. What was {S}'s dream job as a kid?
9. What's {S}'s go-to karaoke song?
10. What's {S}'s most-used emoji?
11. What's {S}'s favorite movie?
12. What's {S}'s phone battery % right now? [closest]
13. How many unread texts does {S} have? [closest]
14. How many hours of screen time did {S} have yesterday? [closest]
15. What was {S}'s first car or first phone?
16. What's {S}'s go-to fast food order?

### Party — Drinking (Party mode; wording kept within App Store Guideline 1.4.3)
1. Who can take a shot with less of a reaction? (your idea; uses a host-set "drink of choice")
2. Who can take a sip with the straightest face while the room tries to make them laugh?
3. Flip cup: first to flip a cup upright wins
4. Bounce a coin into a cup: first to land it
5. Balance your drink on the back of your hand the longest
6. Hold your drink at arm's length the longest
7. Name beer brands, taking turns [TURN]
8. Name cocktails, taking turns [TURN]
9. Pour exactly half a glass; the room judges who's closer
10. Give the best 20-second toast; the room picks the winner
11. One shot each at beer pong; closest to sinking it wins
12. Which country does tequila come from? — Mexico [EXACT]
13. What's the typical alcohol % of wine? — about 12% [CLOSEST]
14. Never Have I Ever face-off: take turns with statements; the first to have done 3 of them loses
15. Stack empty cups or cans the highest in 30s
16. Hold a mouthful of your drink while the room tries to crack you; the first to laugh loses

> Your original "Who can chug their drink the fastest?" is **replaced by #1 and #2**. Speed-drinking prompts are the most common reason drinking-game apps get rejected under Apple 1.4.3.

### Spicy (opt-in toggle within Party; cheeky, never explicit)
1. Best pickup line, said to a player the room picks; the room votes
2. Most embarrassing drunk story in 30s; the room votes
3. Read your last sent text out loud; the funnier one wins (refusing = drink 3)
4. Who's had more relationships? Both reveal; the higher number wins
5. Worst date ever, described in 5 words; the room votes
6. Best "smolder" or seductive pose for 5s; the room votes
7. Make the other person blush first with compliments only
8. Most creative excuse for ghosting someone
9. Slow dance with an imaginary partner; the room votes
10. Write your own dating-app bio on the spot and read it; the room votes
11. Show the 5th most recent photo in your camera roll; the more embarrassing one wins
12. Truth-off: each answers a truth question from the app; refusing = loss
13. Celebrity impression, flirting; the room votes
14. Cheesiest compliment to a player of the room's choice
15. Who's more likely to text an ex tonight? The room votes
16. Describe your type in 3 words; the room guesses who in the room fits it best

> "Room votes" items are judged by the host *after* asking the room. This reuses `HOST_JUDGED`, so no new judging system is needed.

### Picture questions (a type used across Geography, History, Pop Culture and Basic Knowledge)
Only public-domain or licensed images; no brand logos (trademark risk).
1. Flag: Japan
2. Flag: Brazil
3. Flag: Nepal (the only non-rectangular national flag)
4. Flag: South Korea
5. Country outline: Italy
6. Country outline: Chile
7. US state outline: Texas
8. Landmark: Christ the Redeemer
9. Landmark: Petra
10. Landmark: Sydney Opera House
11. Landmark: Angkor Wat
12. Painting: Mona Lisa
13. Painting: *The Starry Night*
14. Animal close-up: zebra stripes
15. Animal: axolotl
16. Zoomed-in everyday object: pineapple skin

### Random
Picks an enabled category weighted by how often it has come up, so the same category doesn't come up three times in a row. The wheel shows "Random" and then a second mini-spin.

**Content target at launch:** about 60 items per trivia category, 40 Physical, 6 mini-games, 40 Know Your Friends, 80 Party, 60 Spicy and 60 Picture, plus each account's history of seen questions so regulars don't get repeats.

---

## 5. Animal avatars and token economy

**Art:** chunky round blob animals built from SVG layers: body, face, ears/horns, accessories. Every animal shares one rig, so one color system recolors all of them and an accessory made once fits every animal. Avatars react: a big grin on WIN, a dizzy green face on DRINK, nervous sweat while being bet on.

| Tier | Price (tokens) | Animals |
|---|---|---|
| Free | 0 | Cat, Dog, Frog, Bear |
| Common | 400 | Bunny, Pig, Penguin, Duck |
| Rare | 1,000 | Fox, Panda, Koala, Raccoon, Owl |
| Epic | 2,500 | Shark, Axolotl, Red Panda, Sloth, Octopus |
| Legendary | 6,000 | Dragon, Unicorn, Yeti |

**Colors:** 6 free base colors. 18 more cost **150 tokens** each (pastels, neons, earth tones). Special finishes like Gold, Galaxy, Rainbow and Glow-in-the-dark cost **1,500**.

**Accessory slots and examples (100–1,200 tokens):**
- **Head:** cap, beanie, party hat, crown, cowboy hat, viking helmet, chef hat, halo
- **Face:** sunglasses, heart glasses, monocle, mustache, clown nose
- **Outfit:** hoodie, tuxedo, Hawaiian shirt, sports jersey, superhero cape, pajamas, leather jacket
- **Hand:** trophy, foam finger, microphone, pizza slice
- **Extras:** profile frame, win animation (confetti, fireworks), drink-splash style (Party mode)

**Earning tokens:**
- 1st place 50, 2nd 35, 3rd 25, everyone else 10
- +2 per correct bet
- Daily login 20, building to 50 with a 7-day streak
- Rewarded ad 25 (up to 5 per day)
- **Premium: everything ×2**

That works out to about 30–60 tokens per game for a free player, so the first Common animal arrives after roughly 8–10 games.

**Buying tokens:** 500 for $0.99 · 1,500 for $2.99 (+bonus) · 4,000 for $6.99 · 10,000 for $14.99.

**Season items:** limited-time cosmetics (Halloween costumes, Santa hats, St. Patrick's) create urgency.

---

## 6. Free vs Premium ($4.99 one-time)

| | Free | Premium |
|---|---|---|
| Players in a room you host | Up to 10 | Unlimited |
| Modes you can host | Classic | Classic, Party, Spicy |
| Rounds | Fixed 10 | Any number |
| Categories | All, always on | Turn each on or off |
| Custom questions and packs | — | Create, save and share by code |
| Ads on **your** phone | After each game | **Never** |
| Tokens | Normal | ×2 |
| Free Party trial | 1 game per account | — |

**Room features follow the host** (Party mode, more than 10 players, rounds, toggles, custom packs). Free guests can play in a Premium host's Party room. **Ads follow each person**: a Premium host still means free guests see ads at the end of the game, exactly as you specified.

---

## 7. Revenue and conversion tactics
1. **Premium unlock**, sold through RevenueCat (buy, restore and checking ownership on both stores).
2. **Token packs** for cosmetics.
3. **Ads:** one interstitial per game on each free player's phone, at the end, skippable after 5s. Rewarded ads are optional. **Nothing during a game.**
4. **Later: paid content packs** (Holiday, College, Movie Night, Sports Mega-Pack) for $1.99 or for tokens.

**Ideas to raise Premium conversion:**
- The **locked Party slice** is always visible on the wheel. Tapping it shows a 10-second Party-mode preview video.
- **Free Party trial** (one game per account). It ends with a recap of that night's best moments next to "Unlock forever for $4.99."
- **A guest who loved a Premium host's Party game** gets "Want to host Party mode yourself?" after the game. These are the warmest possible leads.
- Upsells at the moment of need: an 11th player trying to join, tapping a category toggle, tapping the rounds selector.
- A **Premium badge or crown on the avatar**, visible to the whole room.
- **Launch and seasonal discounts** ($2.99 for New Year's or Super Bowl week).
- At most one unprompted upsell per session, so it never feels pushy.

---

## 8. Retention features
- **Shareable recap card:** the podium, awards and the biggest upset of the night, shareable in one tap to Stories or iMessage with the app link.
- **Fun awards:** Oracle (most correct bets), Underdog Whisperer, Chaos Agent (most No Votes), Iron Liver (most sips, Party mode), Giant Slayer.
- **One-tap rematch** with the same room.
- **Stats:** lifetime wins, betting accuracy and records against friends you've played before (saved for anyone who signed in).
- **Server-driven content:** new questions and seasonal packs with no app update needed. Plus thumbs-up/down and "report question" on each item so weak questions can be removed.
- **Daily streaks** and **achievements** that award tokens.

---

## 9. More improvement ideas (not in v1, ranked by impact)
1. **Web join:** guests play in a browser through the link, with no install, then get a prompt to install the app. The biggest growth lever; planned right after launch.
2. **Big-screen / TV mode:** AirPlay or Chromecast the wheel and leaderboard to a TV while phones stay controllers.
3. **Performance category (crowd vote):** impressions, pitches and dance-offs. Many Spicy items already work this way.
4. **Power-up cards:** Double Down, Veto re-spin, Shield. Could later be a cosmetic or token sink.
5. **Team mode** for big groups (Premium): 2 teams, with challengers drawn from each.
6. **Sound and an "MC" voice** announcing matchups and upsets.
7. **Custom house rules** (Premium): "Loser picks the next category," "Shot on a 3-sip upset."
8. **Tournament bracket mode:** single elimination, finishing with a champion.

---

## 10. App name shortlist
**Call It!** · **Odds On** · **Face Off Party** · **Underdog** · **Pick'em Party** · **Head2Head Party**. Check that the name is free in the App Store, Play Store and as a trademark before committing. *Call It!* fits the betting mechanic best.

---

## 11. Tech stack (simple and managed)
| Need | Choice |
|---|---|
| App | **Expo (React Native) + TypeScript**, Expo Router, EAS cloud builds and store submission |
| Backend | **Supabase**: Postgres, anonymous and Apple/Google sign-in, Realtime, row-level security |
| Live sync | Each room has a `rooms` row as the source of truth. The host phone (or acting judge) runs the round state machine and writes the phase and deadline; every phone subscribes. Players who drop can rejoin by reading the row. |
| Purchases | **RevenueCat** (Premium unlock and token packs) |
| Ads | **Google AdMob** (interstitial and rewarded), with content rating set correctly |
| Animation | Reanimated (wheel, VS screen), Lottie (splashes), `react-native-svg` (avatars) |
| Feel | expo-haptics, expo-av sounds; expo-sensors for mini-games |
| Analytics and crashes | PostHog, Sentry |

**Main tables:**
- `profiles`: name, avatar loadout, tokens, premium, stats
- `rooms`: code, host, mode, spicy, settings, phase, round, matchup, subject, question, deadline, judge
- `room_players`
- `bets`
- `round_results`
- `questions`: category, mode, spicy, type, difficulty, prompt, answer, number value, image, tags
- `custom_packs` and `custom_questions`
- `cosmetics`, `inventory`, `seen_questions`, `token_ledger`

All token changes go through **server functions**, so nobody can hack in free tokens.

**Folder layout:**
```
app/            screens: home, profile/avatar editor, shop, lobby, game/*, results, paywall
src/game/       state machine, selection, scoring, drinks (pure TS + tests)
src/net/        Supabase room client and reconnect
src/content/    question picking, custom packs, picture assets
src/minigames/  one file per mini-game, sharing a common interface
src/avatar/     SVG rig, animals, colors, accessories
src/monetize/   RevenueCat, AdMob, token wallet
supabase/       migrations, security policies, edge functions, seed questions
```

---

## 12. Store compliance (must-dos)
- **Apple 1.4.3:** no speed-drinking or "chug" prompts. Use sips, an optional shot house rule, a "non-alcoholic drinks count too" note and a *Drink responsibly* footer.
- **Age rating:** the whole app gets an adult rating (18+ on iOS, Mature on Play) because of Party mode. Call the free mode **"Classic"**, never "kid-friendly." Never list it in the Kids category.
- **Age gate:** confirm legal drinking age before hosting or joining Party mode.
- **Spicy:** suggestive only, never explicit, so it passes Apple 1.1.4.
- **No real gambling:** bets never stake tokens or money. The in-app label is **"Call it,"** not "bet."
- **Privacy:** privacy policy, the iOS tracking prompt (ATT) for ads, and in-app account deletion.
- **Images:** public-domain or licensed only, with no trademarked logos.

---

## 13. Build phases
0. **Design (1–2 weeks):** pick the name, colors and blob-animal style. Sketch every screen.
1. **Playable core (4–6 weeks):**
   - rooms, lobby and the "I'm playing" toggle
   - state machine, selection, betting timer and No Vote
   - wheel with difficulty
   - spoken trivia with the host's hidden Reveal button
   - judging and judge reassignment
   - scoring with underdog bonus and final-round double
   - podium
   - free animals (Cat, Dog, Frog, Bear) and colors
   - Classic categories, Physical and Know Your Friends
   - about 150 seed questions
   - weekly playtests with friends
2. **The hook (3–4 weeks):**
   - Party and Spicy content
   - drink calculation and DRINK screens
   - age gate
   - the 6 mini-games
   - picture questions
   - Pop Culture and Sports
   - reconnecting after drops
   - share card, awards, sounds and haptics
3. **Money (2–3 weeks):**
   - $4.99 unlock and paywall
   - free Party trial
   - Premium room features (unlimited players, rounds, toggles, custom packs)
   - tokens and ledger
   - shop with tiered animals, colors and accessories
   - AdMob, following the per-person ad rule
4. **Launch (2–3 weeks):**
   - full content library
   - analytics and crash reporting
   - privacy and account deletion
   - store listings
   - TestFlight and Play testing with about 20 groups
   - submission
5. **After launch:** web join, seasonal packs, more mini-games, TV mode, paid packs.

**Fixed costs:** Apple $99 per year and Google $25 once. Every service listed has a free tier to start on.

---

## 14. Verification
- **Unit tests (Jest)** for selection (10,000 simulated games), points and sips (including the 4-bettor minimum, the ≤25% and ≤10% thresholds, No Vote and the final-round double), the betting timer, and the guarantee being dropped for Premium custom round counts.
- **Multi-device runs:**
  - 3–5 phones or simulators in one room
  - the host as challenger (judge reassigned)
  - the hidden Reveal button flow
  - the subject flow in Know Your Friends
  - mini-game judging
  - disconnecting and rejoining
  - the host leaving
- **Purchase and ad tests** (sandbox):
  - Premium host with free guests: guests see ads and the host doesn't
  - a Premium guest in a free room sees no ads
  - the Party trial can only be used once
  - Restore Purchases
- **Real playtests (at least 5 groups):** rounds under 90s, games finished, "one more?" rate.
- **Launch numbers to watch:** install → first game, trial → purchase (target 5–10%), day-7 retention, games per group per week.

---

## Next step once approved
Scaffold Expo + Supabase. Build and test `src/game/` first: selection, scoring and drinks, and the state machine. Then build the lobby and round screens on top.

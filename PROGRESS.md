# Underdog — Progress

_Last updated: 2026-11-09_

## 📱 Play-test with friends (latest)
- **No scrolling:** every screen fits on one phone screen; long screens shrink slightly to fit. The lobby's extra settings moved into a "⚙️ More settings" panel.
- **Multiplayer across phones** works through a free public relay (EMQX) until Supabase is set up. Tested with a host and a guest: joining, renaming and changing avatars (shown on everyone's screen), a full game and a rematch.
- **Play-test build:** Premium is unlocked for everyone, with 5,000 coins each. Publish it with `bash tools/deploy-playtest.sh`, then share https://noahswesade-ai.github.io/call-it-app/

## 🖼️ Icons and polish
- **Your category icons** are on the wheel, the category pills, the lobby and the intro. Party and Spicy keep 🍻 and 🌶️ until they have icons.
- **Avatar editor:**
  - The "Animals" tab is now "Avatars", and the tabs no longer overlap or hide behind the items.
  - The preview is always neutral.
  - Tapping a locked item tries it on (a ~1.5s happy face) and shows an Unlock bar.
- **Results:** a bigger card showing your points or how many sips to drink.
- **Names** appear under every betting avatar, and avatars gently sway on the betting, reveal, results and podium screens.
- **Phone-sized preview:** on a computer, the preview shows the app inside a 390px-wide phone frame instead of stretching to the window.

## 👓 Fit and rules update
- **Every accessory is fitted to every animal.** A tool (`tools/fit_accessories.py`) measures each animal's eyes, head and chin, then places all 47 accessories on all 22 animals individually. All 1,034 combinations were checked on contact sheets.
  - Headphones: the band goes behind the head and the ear cups sit at the sides, so the face stays visible.
  - Necklaces, scarves and collars hang from behind the chin.
  - Hats can never slide down over the eyes.
- **Royal Crown** is Premium-only: it can't be bought with coins and unlocks automatically with Premium.
- **Drinks are fixed** (no host setting any more):
  - 1 sip for a wrong call, losing the face-off, a No Vote or a draw.
  - 3 sips when the Underdog wins.
  - Doubled in the final round.
- Normal mode shows nothing about drinking.

## 🎨 Real art and economy update
- **Your avatar art** is in the game: 22 animals, each with neutral, happy and sad faces, plus 47 wearable accessories in five slots (head, eyes, face, neck, ears).
  - Faces follow the game: neutral when choosing, happy when winning, sad when losing, drinking or being the Underdog.
  - Skipped because they can't go on a head-only avatar: the gloves, the glowing wristband and the astronaut helmet.
  - The adult accessory set only shows after the 18+ check.
- **Rarity and coin prices** are based on research, written up in `PRICING.md`.
  - Animals: Common 500, Rare 1,500, Epic 2,500, Legendary 5,000 coins.
  - Accessories: 150, 400, 900 and 2,000 coins.
  - New coin packs from $0.99 to $49.99, with bonuses of up to +40%.
  - A one-time $1.99 starter pack, offered after a player's 3rd game.
  - Videos give 25 coins each, up to 6 a day.
- **Underdog:** a challenger with 0 votes is now always the Underdog, even in small rooms (and the ×3 applies).
- **Party scoring** uses the same points and leaderboard as Normal mode; on top of that, wrong calls drink as many sips as the right callers scored.
- **Results:** a big green card for a correct call (+points) or a red card for a wrong one ("0 points" in Normal mode, "DRINK N SIPS" in Party). The background turns green or red to match.
- **Underdog reveal, in order:**
  1. The votes drop in.
  2. The percentages count up.
  3. The under-33% number gets a pulsing gold ring and "UNDER 33%!".
  4. "UNDERDOG / 3× MULTIPLIER" appears, with "All points ×3" (or "All points & sips ×3") underneath.
- **Wheel screen** is now about 8 seconds.
- **Question rules** ("HOW TO WIN") now show above the question.
- **Final round:** a fire-themed build-up with a giant "2× POINTS" and who's leading.
- **Party mode is unlocked in test builds** (the preview link and Expo Go) so you can try it. Release builds still need Premium or the free trial.

## 🎡 Polish update
- **Underdog rule:** a challenger is the Underdog only with **under 33%** of the vote (and at least 4 bettors picking a side). If they win it's ×3: points in Classic, sips in Party. No other split has a multiplier.
- **Timer bar:** a yellow loading bar at the bottom of every timed screen (VS, wheel, betting, reveal, results).
- **Wheel:**
  - A ticking sound that slows down with the wheel, then a chime when it lands.
  - The chosen slice grows and glows while the others dim.
  - A box then shows the category, a one-line description and the difficulty.
- **Underdog screen** is now green and positive ("UNDERDOG! A long shot has entered the arena"). The glowing ×3 arrives later, with "POINTS TRIPLED" or "SIPS TRIPLED".
- **Result screen:** the winner pops up first, then everyone who backed them (animal and name), then a +1 (or +3) pops beside each, then your own result and the standings.
- **Awards:** each one now gives its winner **+20 gold coins** and says exactly what it rewards.
- **Intro:** step 3 shows the two animals on their team colors. In development (the preview link and Expo Go), the intro opens on every load so it can be tweaked; real players only see it once.

## 🐶 Underdog update
- **Renamed to Underdog** (app name, home logo, app IDs `com.underdoggame.party`).
- **Signature rule, Underdog ×3:** when bets are revealed, a challenger backed by 25% or less of the room (with at least 4 bettors picking a side) is the Underdog. If they win:
  - Classic: their backers score **×3**.
  - Party: everyone who bet against them drinks **×3**.
  - This replaces the old 2× / 3× tiers.
- **Underdog Alert:** a full-screen takeover with sirens, flashes, the underdog's glowing card, a giant pulsing ×3, the rule, the brave callers and raining 🐶. The reveal stays up longer so it can play.
- The Underdog then carries a pulsing tag through the challenge, and a gold "THE UNDERDOG WON!" banner celebrates if they win.
- **How to play:** shown the first time the app opens. Five picture steps with very few words, and an ✕ in the top right that goes to the home screen. You can reopen it with the **?** on the home screen.
- Practice mode now has 6 bots that pile onto a favorite like real crowds do, so Underdogs show up often.

## 🎨 New look
- **Party-game style:** bold purple gradient with drifting shapes, a chunky rounded game font, and 3D buttons that press down.
- **Home screen:** three big buttons.
  - **Host a Game**
  - **Party Mode:** a darker box with a lock that glows when you hover over it or press it. It reads "Sips & shots, drinking challenges, spicy questions & more".
  - **Join a Game**
- **Name and animal:** now set in the lobby while you wait. Everyone starts with a fun name like "Frog 39".
- **Gold coins** replace tokens. They spin, count up and pop "+N" when you earn them. Earning is deliberately slow so they feel rare: 25 / 15 / 10 / 5 coins for 1st / 2nd / 3rd / everyone else, +1 per correct call, ×2 for Premium.
- **Animation everywhere:**
  - "ROUND N" slams onto the screen, and the fighters slide in on tilted cards.
  - The wheel has blinking marquee bulbs, a clicking pointer and confetti when it lands.
  - Betting has a countdown ring, with a red pulsing edge in the last 10 seconds.
  - The bet reveal shows vote bars growing.
  - Question cards flip in.
  - Results: confetti on a win, beer rain and a dizzy avatar on a DRINK, and live standings.
  - The podium does a drumroll reveal.

## ✅ Done and playable
- **Full game loop:** lobby → VS screen → spinning wheel (category + difficulty) → 30-second betting, with the red last-10-seconds countdown and No Vote → bet reveal → challenge → result → podium after the last round.
- **Fair player picking:** everyone gets a turn whenever the number of rounds allows it, and nobody gets more than one turn ahead of anyone else. Checked by a 10,000-game simulation.
- **Scoring and drinks**, exactly as in PLAN.md:
  - +1 for winners and correct bets
  - Underdog ×3 (only with 4 or more bettors; see above)
  - Party mode: 1 sip for a wrong bet or a No Vote; the loser drinks what the host set (1–3)
  - the final round doubles everything
  - optional "loser takes a shot" final-round rule
- **Judging:**
  - The host's phone keeps the answer hidden until they tap *Reveal answer*, then can *Show on all screens*.
  - If the host is a challenger, a random bettor judges, and the host can always override.
  - In *Know Your Friends*, the subject secretly types the real answer and judges.
  - *Turn-based* questions get a 5-second stall timer.
- **Host tools:** Skip round, Swap a challenger, "I'm playing" toggle, Rematch.
- **Question bank:** all 16 questions per category from the plan (Geography, History, Basic Knowledge, Pop Culture, Sports, Physical, Know Your Friends, Party, Spicy).
- **Party mode:** age gate, Spicy toggle, one free trial game, then locked for hosts without Premium.
- **Free vs Premium:**
  - Free hosts: up to 10 players and fixed 10 rounds.
  - Premium hosts: unlimited players, any number of rounds, category on/off toggles.
  - Room features follow the host.
- **Animal avatars:** 21 cartoon blob animals (Cat, Dog, Frog and Bear free), 28 colors including Gold, Galaxy, Rainbow and Glow, and 24 hats, glasses, outfits and hand items. They react: happy on a win, dizzy and green on DRINK, sweating while being bet on.
- **Gold coins:** earned by placing in games (2× for Premium) and spent to unlock animals, colors and accessories.
- **Awards:** Oracle, Underdog Whisperer, Giant Slayer, Chaos Agent, Iron Liver.
- **Online play code:** works across browser tabs today, and over the internet as soon as Supabase keys are added.
- **Database design** for Supabase, including the security rules: `supabase/migrations/0001_initial.sql`.

## ⏳ Not built yet (next steps)
1. **Phone mini-games** (Reaction Tap, Tap Frenzy, Stop the Clock, Color Clash, Quick Math, Memory). The category is hidden from the wheel until they exist.
2. **Picture questions** (flags, landmarks, outlines).
3. **Real payments and ads.** The Premium button, token packs and ads are in **test mode**: they unlock instantly and take no money. They switch to real RevenueCat and AdMob once your accounts exist; the code to change is all in `src/monetize/store.ts`.
4. **Making your own questions** (Premium), the share card, sounds, and daily login rewards.
5. **Spotting phones that drop offline.** If the host leaves through the Leave button, the next player becomes host, but a phone that just dies isn't detected yet.

## 🙋 What you need to do
1. **Create a free Supabase project** at supabase.com. Then:
   - Copy `.env.example` to `.env` and paste in the Project URL and the anon key (Project Settings → API).
   - In the Supabase SQL editor, run `supabase/migrations/0001_initial.sql`.
2. Later, for real money: create **RevenueCat**, **AdMob**, **Apple Developer** ($99/year) and **Google Play** ($25) accounts.

## 📱 How to try it
- **On this computer (no setup needed):** in the project folder, run `npm install` once, then `npx expo start --web`.
  - *Practice with bots* plays a full game against 4 bots.
  - To test multiplayer, open a second tab at `http://localhost:8081/?as=friend`, then *Host a game* in one tab and *Join* with the code in the other.
- **On your phone:** install **Expo Go** from the App Store or Play Store, run `npx expo start`, and scan the QR code. Practice mode works right away. Playing between several phones needs the Supabase step above.

## 🧪 Checks
`npm test` runs 34 automated tests. `npm run typecheck` checks the code for mistakes.

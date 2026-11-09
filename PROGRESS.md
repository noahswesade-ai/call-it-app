# Call It! — Progress

_Last updated: 2026-11-09_

## ✅ Done and playable
- **Full game loop:** lobby → VS screen → spinning wheel (category + difficulty) → 30-second betting, with the red last-10-seconds countdown and No Vote → bet reveal → challenge → result → podium after the last round.
- **Fair player picking:** everyone gets a turn whenever the number of rounds allows it, and nobody gets more than one turn ahead of anyone else. Checked by a 10,000-game simulation.
- **Scoring and drinks**, exactly as in PLAN.md:
  - +1 for winners and correct bets
  - underdog bonus ×2 / ×3 (only with 4 or more bettors)
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
- **Tokens:** earned by placing in games (2× for Premium) and spent to unlock items.
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

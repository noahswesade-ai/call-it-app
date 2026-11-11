"""The Goals tab of the Underdog Google Doc, as data. tools/goals_to_doc.py turns it into
Docs API requests. Keep this in sync with the doc (both directions)."""

S = {
 'apple_guide': ('Apple App Review Guidelines', 'https://developer.apple.com/app-store/review/guidelines/'),
 'semnexus': ('SEMNexus onboarding benchmarks', 'https://semnexus.com/app-onboarding-flow-benchmarks-where-users-drop-off-2026'),
 'ga26': ('GameAnalytics 2026 benchmarks (GameDev Reports)', 'https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game'),
 'ga25': ('GameAnalytics 2025 benchmarks (GameDev Reports)', 'https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks'),
 'andersen': ('Andersen et al., CHI 2012', 'https://grail.cs.washington.edu/projects/game-abtesting/chi2012/'),
 'jackbox': ('Jackbox: How to play', 'https://www.jackboxgames.com/how-to-play'),
 'heise': ('heise: Google ends Play Instant', 'https://heise.de/-10447201'),
 'apk': ('Google Play: Shrinking APKs, growing installs', 'https://medium.com/googleplaydev/shrinking-apks-growing-installs-5d3fcba23ce2'),
 'wwdc': ('Apple WWDC19 session 423', 'https://developer.apple.com/videos/play/wwdc2019/423/'),
 'nng10': ('NN/g: 10 usability heuristics', 'https://www.nngroup.com/articles/ten-usability-heuristics/'),
 'nngpd': ('NN/g: Progressive disclosure', 'https://nngroup.com/articles/progressive-disclosure/'),
 'nngconf': ('NN/g: Confirmation dialogs', 'https://www.nngroup.com/articles/confirmation-dialog/'),
 'kao': ('Kao 2020, juice study', 'https://www.x-mol.com/paper/1307980428882448384'),
 'singhal': ('Singhal & Schneider, CHI 2021', 'https://uwaterloo.ca/haptic-experience-lab/references/juicy-haptic-design-vibrotactile-embellishments-can-improve'),
 'juice': ('GDC: Juice It or Lose It', 'https://gdcvault.com/play/1016487/Juice-It-or-Lose'),
 'gajadhar': ('Gajadhar et al., "Shared Fun Is Doubled Fun"', 'https://link.springer.com/chapter/10.1007/978-3-540-88322-7_11'),
 'shen': ('Shen, Fishbach & Hsee 2015 (Chicago Booth Review)', 'https://www.chicagobooth.edu/review/uncertainty-can-improve-motivation'),
 'zagal': ('Zagal et al. 2013, dark patterns in games', 'https://research.chalmers.se/en/publication/177148'),
 'wcag231': ('W3C: WCAG 2.3.1 Three Flashes', 'https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html'),
 'wcag': ('W3C: WCAG 2.2', 'https://www.w3.org/TR/WCAG22/'),
 'cba': ('Colour Blind Awareness', 'https://www.colourblindawareness.org/colour-blindness/'),
 'gag': ('Game Accessibility Guidelines', 'https://gameaccessibilityguidelines.com/full-list/'),
 'who': ('WHO: Disability and health', 'https://www.who.int/news-room/fact-sheets/detail/disability-and-health'),
 'vitals': ('Android Developers: Android vitals', 'https://developer.android.com/topic/performance/vitals'),
 'luciq25': ('Luciq Mobile App Stability Outlook 2025', 'https://www.luciq.ai/mobile-app-stability-outlook-2025'),
 'luciq26': ('Luciq: Mobile user expectations 2026', 'https://luciq.ai/no-margin-for-error-mobile-user-expectations-2026'),
 'khalid': ('Khalid et al., What do mobile app users complain about?', 'https://swag.uwaterloo.ca/publications/what-do-mobile-app-users-complain-about.html'),
 'claypool': ('Claypool et al., latency study', 'https://web.cs.wpi.edu/~claypool/papers/csgo-net-local-21/paper.pdf'),
 'render': ('Android Developers: Slow rendering', 'https://developer.android.com/topic/performance/vitals/render'),
 'amplitude': ('Amplitude: UK tech frustration survey', 'https://www.amplitude.com/blog/uk-tech-frustration-survey'),
 'appfollow': ('AppFollow: Mobile game KPIs', 'https://appfollow.io/blog/mobile-game-kpis'),
 'playio': ('Playio: Viral coefficient in mobile games', 'https://blog.playio.co/viral-coefficient-organic-uplift-mobile-games'),
 'kahoot': ('Kahoot!+ plans', 'https://kahoot.com/kahoot-plus/'),
 'wordle': ('TechCrunch: Wordle user growth', 'https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth'),
 'npd': ('NP Digital: App downloads vs ratings', 'https://neilpatel.com/marketing-stats/app-downloads-vs-ratings/'),
 'appleratings': ('Apple: Ratings and reviews', 'https://developer.apple.com/app-store/ratings-and-reviews/'),
 'googlereview': ('Google Play: In-App Review', 'https://developer.android.com/guide/playcore/in-app-review'),
 'sensoramongus': ('Sensor Tower: Among Us downloads', 'https://sensortower.com/blog/among-us-mobile-surpasses-85-million-downloads'),
 'branch': ('Branch case studies', 'https://www.casestudies.com/company/branch'),
 'thumbsticks': ('Thumbsticks: Jackbox audience growth', 'https://www.thumbsticks.com/how-lockdown-opened-up-jackbox-party-to-a-massive-new-audience/'),
 'duolingo': ('Duolingo: How the streak builds habit', 'https://blog.duolingo.com/how-duolingo-streak-builds-habit'),
 'appmagic': ('AppMagic: Mechanics for 2026', 'https://appmagic.rocks/blog/mechanicsfor2026'),
 'sensorlive': ('Sensor Tower: Live ops report', 'https://sensortower.com/report/live-ops'),
 'lenny': ("Lenny's Newsletter: How Duolingo reignited growth", 'https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth'),
 'applepush': ('Apple: Asking permission to use notifications', 'https://developer.apple.com/tutorials/data/documentation/usernotifications/asking-permission-to-use-notifications.md'),
 'digra': ('DiGRA paper on habituation in games', 'https://dl.digra.org/index.php/dl/article/download/923/923/920'),
 'adjust26': ('Adjust Gaming App Insights 2026', 'https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf'),
 'ikea': ('Psychology Today on the IKEA effect (Norton, Mochon & Ariely 2012)', 'https://www.psychologytoday.com/intl/blog/make-your-mind/201209/the-ikea-effect-why-we-cherish-things-we-build'),
 'unity24': ('PocketGamer.biz on Unity 2024 report', 'http://www.pocketgamer.biz/less-than-2-of-mobile-gamers-make-an-in-app-purchase/'),
 'revenuecat': ('RevenueCat 2026 benchmarks', 'https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026'),
 'screenrant': ('Screen Rant: Among Us price', 'https://screenrant.com/among-us-mobile-free-pc-nintendo-switch-price/'),
 'unityint': ('Unity: Interstitial ad best practices', 'https://unity.com/blog/best-practices-for-maximizing-revenue-from-interstitial-ads-in-your-app'),
 'tapjoy': ('Unity/Tapjoy: Rewarded ads and IAP', 'https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement'),
 'p2w': ('Psychology of Games: When pay-to-win backfires', 'https://www.psychologyofgames.com/2015/08/when-the-pay-to-win-button-backfires'),
 'qutee': ('Windows Central on Qutee survey', 'https://www.windowscentral.com/qutee-study-finds-gamers-tolerate-microtransactions-contrary-recent-outrage'),
 'reedsmith': ('Reed Smith: PEGI 2026 risk categories', 'https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/'),
 'mwm': ('MWM: In-game currency', 'https://mwm.ai/glossary/in-game-currency'),
 'headsup': ('Heads Up! on the App Store', 'https://apps.apple.com/us/app/-/id623592465'),
 'macrumors': ('MacRumors: June 2026 guideline change', 'https://macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/'),
 'ageratings': ('Apple: Age ratings values and definitions', 'https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions/'),
 'googleinapp': ('Google Play: Inappropriate content policy', 'https://support.google.com/googleplay/android-developer/answer/9878810'),
 'coppa': ('FTC: COPPA FAQ', 'https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions'),
 'families': ('Google Play: Families policy', 'https://support.google.com/googleplay/android-developer/answer/9893335'),
 'googleugc': ('Google Play: User-generated content policy', 'https://support.google.com/googleplay/android-developer/answer/9876937'),
 'psych': ('Mechanics of Magic on Psych!', 'https://mechanicsofmagic.com/2022/04/19/critical-play-bluffing-judging-and-getting-vulnerable-6/'),
 'jackboxcustom': ('Jackbox Support: custom episodes', 'https://support.jackboxgames.com/hc/en-us/articles/15794763590167-Using-custom-or-user-created-episodes'),
 'trivia': ('Windows Central: Trivia Crack submissions', 'https://www.windowscentral.com/trivia-crack-hit-growing-pains-thanks-flood-user-submitted-questions'),
 'deletion': ('Google Play: Account deletion', 'https://support.google.com/googleplay/android-developer/answer/13327111'),
 'datasafety': ('Google Play: Data safety', 'https://support.google.com/googleplay/android-developer/answer/10787469'),
 'gdpr8': ('GDPR Article 8', 'https://gdpr-info.eu/art-8-gdpr/'),
 'picolo': ('Picolo on the App Store', 'https://apps.apple.com/us/app/id1001473964'),
}

def W(src, text):
    return ('why', text, src)

# Each goal: (title, [ (implication, [why...]) ], [ (execution, [why...]) ])
GOALS = [
 ('Get every friend playing in under a minute', [
   ('No account is needed to host or join. Sign-in, if ever added, is optional and only for saving progress or purchases.', [
     W('apple_guide', 'Apple requires apps without significant account-based features to work without a login (guideline 5.1.1(v)).'),
     W('semnexus', 'Vendor benchmarks estimate 25 to 45% of users drop off at an account-creation step (no published method, treat as directional).'),
   ]),
   ('The first session decides retention, so everything a new player sees first is held to the strictest standard.', [
     W('ga26', 'Across 16,262 mobile games, the median keeps just under 4% of players by day 7, and the top quarter only 6 to 7%.'),
   ]),
   ('Teach by playing, not with a rules screen before the first round.', [
     W('andersen', 'In an A/B test with more than 45,000 players, tutorials helped only the most complex of three games; players learned simple games by experimenting.'),
   ]),
   ('Guests join in a browser from a link, code or QR code, with no install.', [
     W('jackbox', 'Jackbox, the leading party game, only needs one owner; everyone else joins in any browser with a room code.'),
     W('heise', 'Google ended Play Instant in December 2025, so the browser is the only no-install path on Android.'),
   ]),
   ('Keep the download small and the launch fast.', [
     W('apk', 'Google Play measured about a 1% drop in install conversion for every extra 6 MB (2017 data).'),
     W('wwdc', 'Apple aims for the first frame within 400 ms of launch.'),
   ]),
 ], [
   ('Nobody signs up: a new player gets a fun starter name and animal and is in a lobby with one tap.', [
     W('apple_guide', 'Meets the login-free rule in guideline 5.1.1(v) and removes the sign-up step entirely.'),
   ]),
   ('The lobby shows the room code, an Invite button that opens the phone share sheet (or copies the link and says "Link copied"), and a QR code friends can scan from the host phone. Links open straight into the room in the browser.', [
     W('jackbox', 'Same join pattern as Jackbox: code or link, any browser, no install for guests.'),
     W('nng10', 'The "Link copied" confirmation follows the visibility-of-system-status heuristic; before this pass the copy button gave no feedback.'),
   ]),
   ('A short, skippable "How to play" appears once; after that the game explains each rule when it happens: the "How to win" box on every challenge and the "33% of the vote or less = UNDERDOG x3" line during betting.', [
     W('andersen', 'Learning by doing beats front-loaded tutorials for simple games.'),
     W('nngpd', 'Progressive disclosure improves learnability and reduces errors.'),
   ]),
   ('Questions ship as compact text and the sounds are small synthesized files, keeping the app light.', [
     W('apk', 'Smaller downloads convert better, especially on cellular data.'),
   ]),
 ]),

 ('Make every round instantly readable and fair', [
   ('Every phone always shows the current phase, who is hosting, the timer and any active multiplier.', [
     W('nng10', 'Visibility of system status and recognition rather than recall are core usability heuristics.'),
   ]),
   ('Special rules are introduced at the moment they apply, not in a rules screen.', [
     W('nngpd', 'Progressive disclosure shows complexity only when it is needed.'),
   ]),
   ('Players can undo choices where possible; confirmations are kept for serious or irreversible actions, with buttons that name the outcome.', [
     W('nngconf', 'Frequent confirmations train people to click through; buttons should say what happens, and undo is preferred.'),
   ]),
   ('Big effects are rationed: full-screen takeovers only for rare, important moments.', [
     W('kao', 'In a study of about 3,000 players, both no "juice" and extreme juice lowered play time and enjoyment compared with medium juice.'),
     W('singhal', 'Vibration that reinforces what is on screen can increase enjoyment and immersion.'),
   ]),
   ('The game is designed so players look up at each other, not down at their phones.', [
     W('gajadhar', 'Playing with a co-player in the same room raised fun, challenge and perceived competence, driven by social presence.'),
   ]),
   ('Randomness (wheel, multipliers) creates excitement but is never tied to money.', [
     W('shen', 'People work harder for an uncertain reward than a certain, larger one when they focus on the experience.'),
     W('zagal', 'Designs that work against players, including exploiting their social relationships, are classed as dark patterns.'),
   ]),
 ], [
   ('Every round screen shows the round number, a host pill ("You\'re hosting this round!" for a stand-in), a countdown ring, "x / y called it", and the Underdog or Jackpot tag on the challenger throughout the challenge.', [
     W('nng10', 'Keeps the state of the round visible on every phone.'),
   ]),
   ('The host tip ("Read the instructions and the question out loud") sits above the instructions and question it refers to. Challengers see "Ears open!" instead of the question, and the revealed answer appears for everyone except the two challengers.', [
     W('nng10', 'Information appears in a natural, logical order (the instruction before the content it is about); this ordering is our inference from the heuristic.'),
   ]),
   ('A call can be changed until betting closes ("Changed your mind? Tap the other side"), instead of being final on the first tap.', [
     W('nngconf', 'Allowing undo is preferred over forcing players to be careful.'),
   ]),
   ('Confirmation dialogs only appear for leaving and removing a player, with outcome buttons: "Stay" / "Leave", "Keep them" / "Remove".', [
     W('nngconf', 'Confirm only consequential actions and label buttons by outcome.'),
   ]),
   ('Only three takeovers exist: Underdog x3, Final Round x2 and the rare Jackpot x6, each dismissing itself after a few seconds. The x6 explains itself visually: x2 steps aside, x3 joins, and they merge.', [
     W('kao', 'Keeps spectacle in the medium range that tested best.'),
     W('juice', 'Layered animation, sound and shake make key moments feel satisfying.'),
   ]),
   ('Haptics reinforce calls, wins and takeovers.', [
     W('singhal', 'Vibration paired with visuals improved enjoyment in testing.'),
   ]),
 ]),

 ('Include every player', [
   ('Nothing flashes more than three times a second; takeovers are checked at full screen.', [
     W('wcag231', 'WCAG 2.3.1 (Level A) forbids more than three flashes per second above the flash thresholds and says to test at the largest viewing size.'),
   ]),
   ('Animations respect the phone\'s Reduce Motion setting.', [
     W('wcag', 'WCAG 2.2 asks that motion can be paused or turned off.'),
   ]),
   ('No state is shown by color, sound or vibration alone.', [
     W('cba', 'About 1 in 12 men and 1 in 200 women have color vision deficiency.'),
     W('wcag', 'WCAG 1.4.1 forbids color as the only means of conveying information.'),
   ]),
   ('Timing is never precise, and the host can give the room more time.', [
     W('gag', 'Guidelines: do not make precise timing essential, and offer a way to adjust game speed.'),
   ]),
   ('Accessibility is treated as a mainstream requirement.', [
     W('who', 'About 1.3 billion people, 1 in 6, live with a significant disability.'),
   ]),
 ], [
   ('Takeovers use a single soft flash, never strobing.', [
     W('wcag231', 'One flash is well below the three-per-second limit.'),
   ]),
   ('Animations use Reanimated\'s default setting, which follows the system Reduce Motion option (animations jump to their final state).', [
     W('wcag', 'Covers the motion-off requirement without a separate setting.'),
   ]),
   ('Multipliers always appear as text ("x3", "33% OR LESS") as well as color, and both sides of a face-off show names, not only pink and blue.', [
     W('wcag', 'Color is never the only signal.'),
   ]),
   ('New in this pass: the host can set betting time to 30, 45 or 60 seconds; betting still ends early once everyone has called it.', [
     W('gag', 'Adjustable timing helps slower readers and noisy rooms.'),
   ]),
   ('New in this pass: sound effects and vibration can each be switched off on the profile screen.', [
     W('gag', 'Guidelines call for a toggle for any haptics and not relying on sound.'),
   ]),
   ('New in this pass: buttons, toggles and chips that lacked screen-reader roles and labels now have them.', [
     W('gag', 'Guidelines call for screen reader support on mobile.'),
   ]),
 ]),

 ('Never break the room', [
   ('Aim for at least 99.9% crash-free sessions and stay well under Google Play\'s limits (1.09% crash rate, 0.47% freeze rate).', [
     W('vitals', 'Going over the limits can reduce store visibility and add a warning to the listing; rates are per daily user, so they look harsher than per-session numbers.'),
     W('luciq25', 'The median app has 99.95% crash-free sessions; apps under 3 stars have 99.82% (vendor data, no games category).'),
   ]),
   ('Test the full multiplayer flow before every release.', [
     W('khalid', 'In 6,390 low-rated reviews, crashes and functional errors were among the most common complaints, and 11% blamed a recent update.'),
   ]),
   ('Keep every phone on the same phase; a few hundred milliseconds of delay is acceptable for betting.', [
     W('claypool', 'Latency tolerance depends on the type of game; the "under 100 ms for everything" rule is inaccurate.'),
   ]),
   ('Animations stay within the frame budget (16 ms per frame at 60 fps).', [
     W('render', 'Missed frames show as jank; animate position, rotation and opacity rather than layout.'),
   ]),
   ('One dropped phone must never end the game for everyone.', [
     W('amplitude', 'In a vendor survey, 35% abandon apps within minutes when they do not work properly (directional; the recovery design is our inference).'),
   ]),
 ], [
   ('The host phone runs the game and every other phone mirrors it; messages go through two relays at once, duplicates are dropped, and the host re-sends the state every 4 seconds.', [
     W('claypool', 'Prioritizes staying in sync over raw speed, which suits a betting game.'),
   ]),
   ('A guest whose phone goes silent for 45 seconds is removed so voting can continue; if the host disappears, the next player takes over after 30 seconds (45 if the host\'s app was paused); a player who comes back keeps their score; a host who leaves hands hosting to the next player; and the host can hand over hosting from the lobby.', [
     W('amplitude', 'Keeps a broken connection from ending the party.'),
   ]),
   ('New in this pass: if a game screen ever errors, the player sees "Oops, this screen tripped" and one tap redraws the game without leaving the room.', [
     W('luciq26', 'In a vendor survey, 15.4% uninstall after a first crash and another 50.4% after two or three.'),
   ]),
   ('The wheel and takeovers animate only position, rotation and opacity on the UI thread.', [
     W('render', 'Matches Android\'s guidance for smooth animation.'),
   ]),
   ('Every release runs 67 automated rule tests plus scripted multi-phone games. This pass caught and fixed an animation crash and a practice-mode freeze (a bot was chosen as stand-in host).', [
     W('khalid', 'Regressions after updates are a common cause of bad reviews.'),
   ]),
 ]),

 ('Turn every room into the next host', [
   ('Track growth as three rates: guests per room, guest to install, and installer to host. Aim for a viral coefficient of about 0.2 to 0.5, not above 1.', [
     W('appfollow', 'Very few mobile games sustain a viral coefficient above 1.'),
     W('playio', 'Shorter invite cycles compound faster, so measure invite rate and conversion separately (vendor).'),
   ]),
   ('Guests are never forced to pay, install or watch an ad; only the host pays.', [
     W('jackbox', 'Only one Jackbox owner is needed; everyone else plays free.'),
     W('kahoot', 'Kahoot!+ is needed only by the host; players just enter a PIN.'),
   ]),
   ('The best moments are easy to share, without spoilers, with a link back to the game.', [
     W('wordle', 'Wordle grew from about 90 players to over 300,000 within weeks of adding its spoiler-free share grid.'),
   ]),
   ('Keep the rating at 4.5 stars or higher, and ask for ratings only as the platform rules allow.', [
     W('npd', 'Relative to 5 stars, conversion is about 0.96 at 4.5 stars, 0.83 at 4.0 and 0.57 at 3.0 (vendor data).'),
     W('appleratings', 'Apple allows three prompts per year, at moments of satisfaction, without interrupting.'),
     W('googlereview', 'Google forbids asking "Do you like the app?" first or putting the prompt behind a button.'),
   ]),
   ('Design with streamers and creators in mind.', [
     W('sensoramongus', 'Among Us reached 18.4M downloads in August 2020 (+661% in a month) after spreading on YouTube and Twitch.'),
   ]),
 ], [
   ('Premium belongs to the host: one Premium phone unlocks Party, Spicy, custom questions and unlimited players for the whole room.', [
     W('jackbox', 'The host-pays model is proven in party games.'),
   ]),
   ('Changed in this pass: the end-of-game ad shows only on a free host\'s phone; guests never see ads.', [
     W('kahoot', 'Guests are the next hosts, so their first experience stays free of interruptions (our inference from the host-only model).'),
   ]),
   ('New in this pass: "Share the results" on the podium sends the winner, the biggest Underdog upset and a link through the share sheet.', [
     W('wordle', 'A compact, shareable result spreads the game.'),
   ]),
   ('New in this pass: the rating prompt appears only after a finished real game, for the host or a podium finisher, from the second game on, at most once every four months, and never as a "rate us" gate.', [
     W('appleratings', 'Follows Apple\'s timing and frequency rules.'),
     W('googlereview', 'Follows Google\'s rules on how the prompt may be shown.'),
   ]),
   ('New in this pass: the invite button uses the phone share sheet and a QR code is one tap away in the lobby.', [
     W('branch', 'Players who arrive through a deep link are reportedly twice as likely to still use the app after a month (vendor data).'),
   ]),
 ]),

 ('Bring the group back for the next game night', [
   ('Measure retention weekly and per group (repeat rooms within 7, 14 and 28 days); daily benchmarks are secondary.', [
     W('ga26', 'Classic benchmarks are low: top-quarter day-1 retention just above 30%, median day-7 under 4%, median day-30 under 1%.'),
     W('thumbsticks', 'Party games peak around holidays such as Thanksgiving and Christmas rather than daily.'),
   ]),
   ('Multiplayer alone does not keep players; the group needs a reason to return.', [
     W('ga25', 'Multiplayer games lead on session length but struggle with long-term retention.'),
   ]),
   ('Streaks match how parties are played: in-game win streaks rather than daily login streaks.', [
     W('duolingo', 'Small streak features moved retention (Streak Freeze +0.38% daily users; a new streak animation +1.7% day-7 for new learners).'),
   ]),
   ('Content stays fresh through themed packs and memory of what a group has seen, not through constant events.', [
     W('appmagic', 'Event counts rose from 73 to 89 per month in 2025 and "event fatigue" is a documented risk.'),
     W('sensorlive', '78% of the top 1,000 live-ops games saw revenue fall from early 2024 to early 2025.'),
   ]),
   ('Notifications, if added, are rare and social, and permission is asked after the first fun game.', [
     W('lenny', 'Duolingo protected its notification channel: increasing volume needed CEO approval.'),
     W('applepush', 'iOS lets apps send quiet notifications without an upfront permission prompt.'),
   ]),
 ], [
   ('Win streaks of 3 or more show a flickering flame and counter in the standings, without interrupting play.', [
     W('duolingo', 'Visible streaks reinforce returning and continuing.'),
   ]),
   ('Rematch keeps everyone in the room, the host can bring everyone back to the lobby, and the lobby\'s own questions carry over to every game.', [
     W('ga25', 'Keeps the group together for the next game (rematch rates are not public; this is our inference).'),
   ]),
   ('New in this pass: each phone remembers up to 3,000 questions it has seen, even after the app closes, so the next game night does not repeat them. Room games (Truth or Dare and similar) may repeat.', [
     W('digra', 'Familiarity and predictability lead to habituation and boredom.'),
   ]),
   ('Coins earned every game buy cosmetics that friends see on their phones.', [
     W('adjust26', 'Light progression is being added even to simple games to extend play (vendor data).'),
   ]),
   ('"My questions" brings every question a player has written to any new lobby in one tap.', [
     W('ikea', 'People value what they make themselves more, when they finish making it.'),
   ]),
 ]),

 ('Earn from the host and the look, never the outcome', [
   ('Expect 1 to 3% of installs to buy Premium, and judge success by conversion among hosts.', [
     W('unity24', '1.83% of mobile gamers make an in-app purchase (vendor data).'),
     W('revenuecat', 'Freemium apps convert a median 2.1% (vendor data, mostly non-game apps).'),
   ]),
   ('Premium stays a one-time $4.99 purchase, not a subscription.', [
     W('revenuecat', 'About 72% of annual subscribers cancel in the first year, a poor fit for occasional party play.'),
     W('screenrant', 'Among Us earned most of its 2020 revenue from a $5 upfront price.'),
   ]),
   ('Upgrade moments come early.', [
     W('unity24', 'About 92% of repeat buyers buy again within 30 days of their first purchase.'),
   ]),
   ('Paywalls appear when a player reaches for a feature, and every cost is visible before a game starts, never mid-round.', [
     W('khalid', 'Hidden-cost complaints had the most negative effect on ratings of 12 complaint types.'),
     W('kahoot', 'Kahoot caps free players and lifts the cap with its paid plan, so player count works as an upgrade trigger.'),
   ]),
   ('At most one interstitial ad, at the end of a game; rewarded ads are optional.', [
     W('unityint', 'Interstitials after an end-of-level screen did not significantly hurt day-7 or day-14 retention (vendor data).'),
     W('tapjoy', 'Players who watched rewarded ads were about 4.5x more likely to make a first purchase (correlation, vendor data).'),
   ]),
   ('Nothing that can be bought affects scores, bets, the wheel or the Underdog outcome.', [
     W('p2w', 'Players who pay to win are respected less and seen as less skilled.'),
     W('qutee', '69% of players found cosmetic purchases acceptable (survey, about 2017).'),
   ]),
   ('Everything sold is fixed and visible before purchase, with no countdown or scarcity pressure.', [
     W('reedsmith', 'Under the 2026 PEGI rules, time-limited offers earn a risk descriptor.'),
     W('apple_guide', 'Apple requires odds disclosure for paid random items (guideline 3.1.1).'),
   ]),
 ], [
   ('Classic is free and complete; Premium is a one-time $4.99 with a working "Restore purchases" button.', [
     W('headsup', 'Heads Up! reviews complain about paid decks that fail to restore.'),
   ]),
   ('Locked Party and Spicy tiles and the "Add your own questions" button appear in every lobby with a lock and open the Premium screen; a free room\'s 10-player cap and one free Party game also lead there.', [
     W('kahoot', 'Feature and player-count limits are proven upgrade moments.'),
   ]),
   ('Changed in this pass: the Premium screen leads with what the whole room gets and frames the price as less than $1 per friend.', [
     W('jackbox', 'Host-pays framing (our inference: the price is shared value for the room).'),
   ]),
   ('Points, bets and multipliers cannot be bought; coins only buy looks, and Premium doubles coins earned.', [
     W('p2w', 'Keeps wins earned, which protects how players see each other.'),
   ]),
   ('Changed in this pass: the coin starter pack no longer has a 72-hour countdown; the store uses fixed packs with growing bonuses and a "Most popular" label.', [
     W('reedsmith', 'Avoids the PEGI time-pressure descriptor.'),
     W('mwm', 'A rising bonus ladder is the common pack structure (vendor how-to).'),
   ]),
   ('Rewarded videos for coins are optional and capped per day.', [
     W('tapjoy', 'Opt-in rewarded ads pair well with purchases.'),
   ]),
 ]),

 ('Ship an honest 18+ party game that passes review', [
   ('Present Underdog as a face-off betting party game in which drinking is an optional forfeit; "drinking game" never leads the title or keywords.', [
     W('apple_guide', 'Guideline 4.3(b) now calls drinking games "mediocre, low-quality, or low-effort".'),
     W('macrumors', 'Apple tightened the saturated-category rule in June 2026.'),
   ]),
   ('One app, with modes unlocked by in-app purchase.', [
     W('apple_guide', 'Guideline 4.3(a) forbids separate copies of the same app; variations should use in-app purchases.'),
   ]),
   ('Rate the app 18+ honestly.', [
     W('ageratings', 'Frequent alcohol, sexual content or simulated gambling each map to 18+.'),
   ]),
   ('Never encourage excessive drinking or drinking by minors.', [
     W('apple_guide', 'Guideline 1.4.3 rejects apps that encourage excessive alcohol consumption.'),
     W('googleinapp', 'Google bans portraying excessive drinking favorably.'),
   ]),
   ('Spicy content stays suggestive and non-graphic.', [
     W('apple_guide', 'Guideline 1.1.4 bans explicit descriptions intended to stimulate erotic feelings.'),
   ]),
   ('Use a neutral age check before adult modes.', [
     W('coppa', 'Age screens must ask in a neutral way, not lead users to the "right" answer.'),
   ]),
   ('Art and store images read as adult, even with cute animals.', [
     W('families', 'Child-appealing imagery can override a declared adult audience on Google Play.'),
   ]),
   ('Points are never money.', [
     W('ageratings', 'Betting without real money is rated as simulated gambling, not gambling.'),
   ]),
 ], [
   ('Forfeits are sips (1, or 3 when the Underdog wins, doubled in the final round), "any drink counts, non-alcoholic too", and there are no chugging or speed challenges. Changed in this pass: marketing says "sips" instead of "shots", and the one shot challenge became a sip of something sour.', [
     W('apple_guide', 'Keeps drinking moderate and optional under guideline 1.4.3.'),
   ]),
   ('Changed in this pass: Party and Spicy now ask for a birth year (18+) instead of an "I\'m of legal drinking age" button, and an under-age answer is remembered so retrying does not unlock them.', [
     W('coppa', 'A neutral age screen as the FTC describes.'),
   ]),
   ('Spicy is opt-in, only inside Party mode, and written as suggestive text with no images. Some new Spicy prompts (naming positions or places) sit near the line and should be reviewed before submission.', [
     W('apple_guide', 'Guideline 1.1.4 permits suggestive, non-explicit text in an 18+ app.'),
   ]),
   ('Points have no cash value and cannot be bought or exchanged.', [
     W('ageratings', 'Keeps betting in the simulated, non-monetary category.'),
   ]),
   ('Before submission: Review Notes describing the face-off and Underdog mechanics, and store screenshots without alcohol or Spicy content.', [
     W('apple_guide', 'Guidelines 2.3.1 and 2.3.8 require specific notes and 4+-appropriate screenshots.'),
   ]),
 ]),

 ('Make custom questions personal, fast and safe', [
   ('Player-written questions are treated as user-generated content: filtering, a way to remove or report, and published contact details.', [
     W('apple_guide', 'Guideline 1.2 requires filtering, reporting, blocking and contact information for user content.'),
     W('googleugc', 'Google requires in-app reporting and ongoing moderation of user content.'),
   ]),
   ('Questions must not sexually target or bully real people.', [
     W('apple_guide', 'Guideline 1.2 bars objectifying real people and bullying.'),
   ]),
   ('Writing a question is quick, and written questions actually come up in play.', [
     W('ikea', 'People value what they make only when they finish making it.'),
   ]),
   ('Personal means the people in the room.', [
     W('psych', 'Psych!\'s most popular mode puts players\' names into every prompt.'),
   ]),
   ('Avoid repeats across game nights, not only within one.', [
     W('digra', 'Predictable content leads to boredom.'),
     W('headsup', 'Heads Up! keeps adding themed decks (40+).'),
   ]),
 ], [
   ('One short form (category, type, difficulty, question, answer). Every question written is saved to "My questions", which can add them to any Premium lobby one by one or all at once.', [
     W('ikea', 'Quick to finish and reusable, so the effort pays off.'),
   ]),
   ('When the wheel lands on a category with unused lobby questions, it picks one 75% of the time. "Only our questions" mode needs at least 10 per selected category and warns the host when that is not met.', [
     W('jackboxcustom', 'Jackbox also requires a minimum number of custom prompts and falls back to built-in content.'),
   ]),
   ('New in this pass: a "YOUR CREW\'S" label appears when a player-written question comes up.', [
     W('ikea', 'Players see their own work in play.'),
   ]),
   ('New in this pass: a filter blocks slurs and threats (checked again on the host phone), the form states the rule against bullying or sexually targeting real people, and the host can remove any lobby question from the lobby list or with "Remove this question" mid-game, which swaps in another question for free.', [
     W('apple_guide', 'Meets the filtering and removal parts of guideline 1.2.'),
     W('googleugc', 'Covers Google\'s moderation requirement for content shared in a room.'),
   ]),
   ('Questions stay inside the room and the player\'s own phone; there is no public question pool.', [
     W('trivia', 'An open pool brings a heavy moderation load (Trivia Crack accepted about 1,500 of about 1M daily submissions).'),
   ]),
   ('Before release: a published support contact and an in-app report path.', [
     W('apple_guide', 'Guideline 1.2 requires published contact information.'),
   ]),
 ]),

 ('Collect the least data needed', [
   ('Profiles stay on the phone. If accounts are added, offer in-app account deletion and a web deletion link.', [
     W('apple_guide', 'Apps that offer accounts must offer deletion in the app (guideline 5.1.1(v)).'),
     W('deletion', 'Google requires both an in-app path and a web link.'),
   ]),
   ('Every ad or analytics SDK is declared accurately in the store privacy forms.', [
     W('datasafety', 'The Data safety form must cover data collected by third-party SDKs.'),
   ]),
   ('Track only with permission, and get consent for personalized ads in the EU and UK.', [
     W('apple_guide', 'Guideline 5.1.2 requires App Tracking Transparency permission.'),
     W('gdpr8', 'GDPR Article 8 requires parental consent under 16 (13 to 16 by country).'),
   ]),
 ], [
   ('Profile, coins, cosmetics, "My questions" and seen-question memory are stored only on the phone, with no sign-up.', [
     W('apple_guide', 'Nothing to delete or disclose beyond the device.'),
   ]),
   ('Game messages carry only names, avatars, bets and the room\'s questions, and nothing is stored on a server.', [
     W('picolo', 'The closest competitor declares only minimal analytics data, a standard to match.'),
   ]),
   ('Before real ads launch: App Tracking Transparency and consent prompts, and account deletion if sign-in is added.', [
     W('apple_guide', 'Required by guidelines 5.1.2 and 5.1.1(v).'),
   ]),
 ]),
]

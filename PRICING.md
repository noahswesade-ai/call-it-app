# Underdog: avatar and coin pricing

_2026-11-10. These are the prices in `src/avatar/catalog.ts` and `src/monetize/store.ts`._

## Goals (in order)
1. **Revenue from coin packs**, the main goal.
2. **Retention:** a reason to come back and play "one more game".
3. **Ad revenue** from optional rewarded videos, without making buying pointless.

## What the research says
- **Use a few clear price points with growing bonuses.** Successful free-to-play games use a small, fixed ladder of price points, and bigger packs give a bigger bonus. A cheap pack acts as an "anchor" that makes the bigger packs look like better value. ([Game Developer](https://www.gamedeveloper.com/business/5-premium-currency-pricing-trends-and-tricks-used-by-mobile-free-to-play-games), [Playio](https://blog.playio.co/in-game-currency-design), [Wikipedia: gacha games](https://en.wikipedia.org/wiki/Gacha_game))
- **Starter packs convert best.** Google Play's guidance recommends a cheap starter pack ($0.99–$2.99), offered for only 3–5 days. In one case study, over 50% of buyers chose the starter pack over regular offers when it appeared around the 4th session. Most players who ever buy do so in their first 2 weeks. ([Google Play](https://android-developers.googleblog.com/2016/08/5-tips-to-help-you-improve-game-as-a-service-monetization.html), [Fungies](https://fungies.io/how-to-effectively-monetize-your-player-base-in-mobile-games.md))
- **Rewarded videos go with better retention, but too many free coins hurt sales.** Players who watched rewarded ads had 53–68% 30-day retention, against a 13% benchmark. That's a correlation, not proof the ads cause it. Separately, handing out too much free currency is a common reason players stop buying. ([Unity](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement), [Playio](https://blog.playio.co/in-game-currency-design))
- **Cosmetic prices by rarity span about 10×.** Brawl Stars prices skins at 29 / 79 / 149 / 199 / 299 gems from Rare to Legendary. That's roughly $1 to $10, a 10× range from cheapest to dearest. ([Mobile Matters](https://mobilematters.gg/brawl-stars/brawl-stars-guide-to-skin-rarities))

## Coin value
**$0.99 = 500 coins**, so 1,000 coins is worth about $2. Everything below is anchored to that.

## Coin packs
| Price | Coins | Bonus | Tag |
|---|---|---|---|
| $0.99 | 500 | none | |
| $4.99 | 2,750 | +10% | |
| $9.99 | 6,000 | +20% | **Most popular** |
| $19.99 | 13,000 | +30% | |
| $49.99 | 35,000 | +40% | **Best value** |

**Starter pack:** $1.99, one time only. It includes 2,000 coins plus Star Glasses (Rare), about 4× the value of the base pack. It appears after the player's **3rd game** and lasts **72 hours**.

## Animals (22)
| Tier | Price | ≈ $ | Animals | Why |
|---|---|---|---|---|
| Free | 0 | | Dog, Cat, Frog, Bear | Your choice |
| Common | 500 | $1 | Bunny, Pig, Lamb, Beaver, Seal, Squirrel | Familiar animals. A free player unlocks one within a few days, which is the early win that builds the habit. |
| Rare | 1,500 | $3 | Owl, Koala, Fawn, Flamingo, Chameleon | Cuter and more distinctive. About 2 weeks of free play, or one small purchase. |
| Epic | 2,500 | $5 | Panda, Fox, Red Panda, Pangolin | The animals people search for online. Priced at the $4.99 pack. |
| Legendary | 5,000 | $10 | Axolotl, Narwhal, Dragon | Cult favourites and fantasy animals, the status pieces. About 2 months free, so most will buy the $9.99 pack. |

## Accessories (47 usable)
Accessories cost less than animals. They're impulse buys and a collection to complete, so there's always something next to unlock.

| Tier | Price | Examples |
|---|---|---|
| Common | 150 | Beanie, Party Hat, Red Bow, Bunny Ears, Round Glasses, Mustache, Bow Tie, Striped Tie, Scarf |
| Rare | 400 | Top Hat, Pirate Hat, Headphones, Heart and Star Glasses, Hero Mask, Monocle, Santa Beard, Pearls, Hoops |
| Epic | 900 | Wizard Hat, Devil Horns, Halo, Laurel, Mohawk, Rainbow Wig, Cyber Visor, Masquerade, Gem Collar, Nose Ring |
| Legendary | 2,000 | Tiara, Gold Chain, Diamond Studs |
| Premium only | (not for sale) | **Royal Crown**: comes with Premium, so a crown in the lobby means a Premium player |

**Party collection (18+):** only shown after the age check, so it also nudges players toward Party mode.
- Rare: Poker Visor, Cat-Eye Shades, Feather Boa, Lucky Dice Earrings.
- Epic: Martini Headband, Rose Top Hat, Lace Mask, Spiked Heart Collar.
- Legendary: Beer Helmet, the signature Party item.

**Left out:** the gloves, the glowing wristband and the astronaut helmet. A head-only avatar can't wear them; the helmet would cover the face.

## Earning coins (free players)
| Source | Coins |
|---|---|
| Finishing a game: 1st / 2nd / 3rd / everyone else | 25 / 15 / 10 / 5 |
| Each correct call | +1 |
| Each end-of-game award | +20 |
| Rewarded video | +25, up to 6 per day (150/day max) |
| Premium | ×2 on game coins |

A regular free player (a few games plus some videos a day) earns roughly 100–200 coins a day. That pace means:
- **Common:** a few days.
- **Rare:** about 2 weeks.
- **Epic / Legendary:** months, unless they buy coins, which is where the $4.99 and $9.99 packs come in.

## What to measure after launch, then tune
- % of players who buy (target 2–5%).
- How many take the starter pack.
- Which pack sells most (it should be $9.99).
- Videos watched per player per day.
- Day-7 and day-30 retention for players who watch videos versus those who don't.

If sales are low and players are hoarding coins, cut free coins (the video reward or the daily cap) before raising prices.

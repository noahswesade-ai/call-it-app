import type { Category, Difficulty, MinigameId, Question, QuestionType } from '@/game/types';

// Seed question bank (PLAN.md §4). Later this moves to the Supabase `questions`
// table so new content ships without an app update; this file stays as the
// offline fallback. Answers marked † in the plan must be re-checked before launch.

type Seed = [prompt: string, type: QuestionType, difficulty: Difficulty, answer?: string, numeric?: number];

const X: QuestionType = 'SPOKEN_EXACT';
const C: QuestionType = 'SPOKEN_CLOSEST';
const T: QuestionType = 'TURN_BASED';
const H: QuestionType = 'HOST_JUDGED';
const K: QuestionType = 'SUBJECT_JUDGED';

function build(category: Category, seeds: Seed[]): Question[] {
  return seeds.map(([prompt, type, difficulty, answer, numeric], i) => ({
    id: `${category}-${String(i + 1).padStart(3, '0')}`,
    category,
    type,
    difficulty,
    prompt,
    answer,
    numericAnswer: numeric,
  }));
}

export const GEOGRAPHY = build('geography', [
  ['Which river is the longest in the world?', X, 'M', 'The Nile (accept the Amazon — it’s disputed)'],
  ['What is the population of India?', C, 'M', 'About 1.45 billion', 1_450_000_000],
  ['What is the capital of Australia?', X, 'E', 'Canberra'],
  ['Which country has the most time zones (counting overseas territories)?', X, 'H', 'France (12)'],
  ['What is the smallest country in the world?', X, 'E', 'Vatican City'],
  ['How tall is Mount Everest, in meters?', C, 'M', '8,849 m', 8849],
  ['How many countries are in Africa?', C, 'M', '54', 54],
  ['Which US state has the longest coastline?', X, 'M', 'Alaska'],
  ['What is the deepest point in the ocean?', X, 'E', 'The Mariana Trench (Challenger Deep)'],
  ['What is the largest desert on Earth?', X, 'H', 'Antarctica (the Sahara is the largest hot desert)'],
  ['How many US states border Canada?', C, 'H', '13', 13],
  ['What is the most populous country in South America?', X, 'E', 'Brazil'],
  ['How far is New York from Los Angeles in a straight line, in miles?', C, 'H', 'About 2,450 miles', 2450],
  [`Name the countries that border Germany.`, T, 'H', 'Denmark, Poland, Czechia, Austria, Switzerland, France, Luxembourg, Belgium, Netherlands'],
  [`Name countries in Europe.`, T, 'M'],
  ['What is the capital of Canada?', X, 'E', 'Ottawa'],
]);

export const HISTORY = build('history', [
  ['In what year did the Industrial Revolution begin?', C, 'M', 'About 1760', 1760],
  ['Which American town became famous for its witch trials?', X, 'E', 'Salem, Massachusetts'],
  ['In what year did the Titanic sink?', C, 'E', '1912', 1912],
  ['Who was the first person to walk on the Moon?', X, 'E', 'Neil Armstrong (1969)'],
  ['In what year did the Berlin Wall fall?', C, 'M', '1989', 1989],
  ['How many years did the Hundred Years’ War actually last?', C, 'H', '116 years', 116],
  ['Who was the 16th president of the United States?', X, 'E', 'Abraham Lincoln'],
  ['In what year did Columbus first reach the Americas?', C, 'E', '1492', 1492],
  ['Which civilization built Machu Picchu?', X, 'M', 'The Inca'],
  ['In what year did World War II end?', C, 'E', '1945', 1945],
  ['Who was the first woman to win a Nobel Prize?', X, 'M', 'Marie Curie (1903)'],
  ['Which of the Seven Wonders of the Ancient World is still standing?', X, 'M', 'The Great Pyramid of Giza'],
  ['How many wives did Henry VIII have?', C, 'E', '6', 6],
  ['In what year was the US Declaration of Independence adopted?', C, 'E', '1776', 1776],
  ['Which country gave the Statue of Liberty to the United States?', X, 'E', 'France'],
  [`Name US presidents.`, T, 'M'],
]);

export const BASIC = build('basic', [
  ['What is the fastest land animal?', X, 'E', 'The cheetah'],
  ['How much does a blue whale’s heart weigh, in kg?', C, 'H', 'About 180 kg', 180],
  [`Name capital cities.`, T, 'M'],
  ['How many bones are in the adult human body?', C, 'M', '206', 206],
  ['What is the chemical symbol for gold?', X, 'M', 'Au'],
  ['How many hearts does an octopus have?', X, 'M', '3'],
  ['What is the boiling point of water in °F?', C, 'E', '212 °F', 212],
  ['What is the largest planet in our solar system?', X, 'E', 'Jupiter'],
  ['How many minutes are in a week?', C, 'M', '10,080', 10080],
  ['What is the hardest natural substance?', X, 'E', 'Diamond'],
  ['How many keys are on a standard piano?', C, 'M', '88', 88],
  ['What is the speed of light, in km per second?', C, 'H', 'About 300,000 km/s (299,792)', 299792],
  ['Which gas do plants take in from the air?', X, 'E', 'Carbon dioxide (CO₂)'],
  ['How many teaspoons are in a tablespoon?', X, 'M', '3'],
  [`Name animals that start with “B”.`, T, 'E'],
  ['How many legs does a spider have?', X, 'E', '8'],
]);

export const POP_CULTURE = build('popculture', [
  ['Which TV show features “the Upside Down”?', X, 'E', 'Stranger Things'],
  ['How many main Harry Potter books are there?', X, 'E', '7'],
  ['What is the highest-grossing film of all time (not adjusted for inflation)?', X, 'M', 'Avatar (2009)'],
  ['Which artist released the album “1989”?', X, 'E', 'Taylor Swift'],
  ['How many seasons did Friends run?', C, 'M', '10', 10],
  ['In what year did the first iPhone come out?', C, 'M', '2007', 2007],
  ['Who played Jack in Titanic?', X, 'E', 'Leonardo DiCaprio'],
  ['Which band was Harry Styles in?', X, 'E', 'One Direction'],
  ['What is the name of the coffee shop in Friends?', X, 'M', 'Central Perk'],
  ['How many Oscars did Titanic win?', C, 'H', '11', 11],
  ['Which video game series stars Master Chief?', X, 'M', 'Halo'],
  ['What is the name of Shrek’s wife?', X, 'E', 'Fiona'],
  ['Which streaming service released Squid Game?', X, 'E', 'Netflix'],
  ['In what year did YouTube launch?', C, 'M', '2005', 2005],
  [`Name Marvel superheroes.`, T, 'E'],
  [`Name Pixar movies.`, T, 'M'],
]);

export const SPORTS = build('sports', [
  ['How many players does a soccer team have on the field?', X, 'E', '11'],
  ['Which country has won the most men’s FIFA World Cups?', X, 'M', 'Brazil (5)'],
  ['How many rings are on the Olympic flag?', X, 'E', '5'],
  ['What was Michael Jordan’s famous jersey number?', X, 'E', '23'],
  ['How long is a marathon, in miles?', C, 'M', '26.2 miles', 26.2],
  ['What is Usain Bolt’s 100m world record, in seconds?', C, 'H', '9.58 s', 9.58],
  ['Which sport uses a shuttlecock?', X, 'E', 'Badminton'],
  ['How many points is a touchdown worth?', X, 'E', '6'],
  ['How many holes are in a standard round of golf?', X, 'E', '18'],
  ['Which city hosted the 2016 Summer Olympics?', X, 'M', 'Rio de Janeiro'],
  ['What is a perfect score in ten-pin bowling?', C, 'M', '300', 300],
  ['How many players does a baseball team have on the field?', X, 'E', '9'],
  ['How many Grand Slam singles titles has Novak Djokovic won?', C, 'H', '24', 24],
  ['How many minutes long is an NBA game, not counting overtime?', C, 'M', '48', 48],
  [`Name NBA teams.`, T, 'M'],
  [`Name Premier League clubs.`, T, 'M'],
]);

export const PHYSICAL = build('physical', [
  ['Who can do the most push-ups in 30 seconds?', H, 'M'],
  ['Who can hold their breath the longest?', H, 'M'],
  ['Rock, Paper, Scissors — best of 3!', H, 'E'],
  ['Who can hold a wall sit the longest?', H, 'H'],
  ['Who can hold a plank the longest?', H, 'H'],
  ['Who can stand on one leg with their eyes closed the longest?', H, 'M'],
  ['Thumb war — best of 3!', H, 'E'],
  ['Who can do the most jumping jacks in 30 seconds?', H, 'M'],
  ['Staring contest — first to blink loses!', H, 'E'],
  ['Who can balance a spoon on their nose the longest?', H, 'H'],
  ['Who can say the alphabet backwards the fastest?', H, 'H'],
  ['Say “Red lorry, yellow lorry” three times fast — fewest mistakes wins.', H, 'M'],
  ['Who can do the most squats in 30 seconds?', H, 'M'],
  ['Who can hop on one foot the longest?', H, 'M'],
  ['Bottle flip — first to land one wins!', H, 'M'],
  ['Who can stack the most coins in 30 seconds?', H, 'M'],
]);

export const KNOW_YOUR_FRIENDS: Question[] = (
  [
    ['What is {S}’s favorite food?'],
    ['What is {S}’s go-to drink order?'],
    ['Which month is {S}’s birthday in?'],
    ['What is {S}’s dream travel destination?'],
    ['What is {S}’s middle name?'],
    ['What is {S}’s biggest fear?'],
    ['Which celebrity would {S} most want to meet?'],
    ['What was {S}’s dream job as a kid?'],
    ['What is {S}’s go-to karaoke song?'],
    ['What is {S}’s most-used emoji?'],
    ['What is {S}’s favorite movie?'],
    ['What is {S}’s phone battery % right now?', true],
    ['How many unread texts does {S} have?', true],
    ['How many hours of screen time did {S} have yesterday?', true],
    ['What was {S}’s first car (or first phone)?'],
    ['What is {S}’s go-to fast food order?'],
  ] as [string, boolean?][]
).map(([prompt, closest], i) => ({
  id: `kyf-${String(i + 1).padStart(3, '0')}`,
  category: 'kyf' as const,
  type: K,
  difficulty: 'M' as const,
  prompt,
  closest: closest ?? false,
}));

export const PARTY = build('party', [
  ['Who can take a shot (of their drink of choice) with less of a reaction?', H, 'M'],
  ['Who can take a sip with the straightest face while the room tries to make them laugh?', H, 'E'],
  ['Flip cup — first to flip their cup upright wins!', H, 'M'],
  ['Bounce a coin into a cup — first to land it wins!', H, 'H'],
  ['Who can balance their drink on the back of their hand the longest?', H, 'M'],
  ['Who can hold their drink at arm’s length the longest?', H, 'M'],
  [`Name beer brands.`, T, 'M'],
  [`Name cocktails.`, T, 'M'],
  ['Pour exactly half a glass — the room judges who’s closer.', H, 'E'],
  ['Give the best 20-second toast — the room picks the winner.', H, 'E'],
  ['One beer-pong shot each — closest to sinking it wins.', H, 'M'],
  ['Which country does tequila come from?', X, 'E', 'Mexico'],
  ['What is the typical alcohol % of wine?', C, 'M', 'About 12%', 12],
  ['Never Have I Ever face-off: take turns making statements — first to have done 3 loses.', H, 'M'],
  ['Who can stack empty cups or cans the highest in 30 seconds?', H, 'M'],
  ['Hold a mouthful of your drink while the room tries to crack you — first to laugh loses.', H, 'H'],
]);

export const SPICY = build('spicy', [
  ['Best pickup line, delivered to a player the room picks — the room votes.', H, 'M'],
  ['Most embarrassing drunk story in 30 seconds — the room votes.', H, 'M'],
  ['Read your last sent text out loud — funnier one wins. Refusing = drink 3.', H, 'H'],
  ['Who has had more relationships? Both reveal — higher number wins.', H, 'M'],
  ['Describe your worst date ever in 5 words — the room votes.', H, 'E'],
  ['Best “smolder” for 5 seconds — the room votes.', H, 'E'],
  ['Make the other person blush first — compliments only.', H, 'M'],
  ['Most creative excuse for ghosting someone — the room votes.', H, 'E'],
  ['Slow dance with an imaginary partner — the room votes.', H, 'E'],
  ['Write your dating-app bio on the spot and read it out — the room votes.', H, 'M'],
  ['Show the 5th most recent photo in your camera roll — more embarrassing one wins.', H, 'H'],
  ['Truth-off: each answers “What’s the most awkward thing you’ve done on a date?” Refusing = loss.', H, 'H'],
  ['Flirty celebrity impression — the room votes.', H, 'M'],
  ['Cheesiest compliment to a player of the room’s choice — the room votes.', H, 'E'],
  ['Who is more likely to text an ex tonight? The room votes — the “winner” loses.', H, 'E'],
  ['Describe your type in 3 words — the room votes for the best description.', H, 'E'],
]);

const MINIGAME_NAMES: [MinigameId, string, Difficulty][] = [
  ['reaction', 'Reaction Tap — tap the instant the screen turns green. Too early and you lose!', 'E'],
  ['tapFrenzy', 'Tap Frenzy — most taps in 10 seconds wins.', 'E'],
  ['stopClock', 'Stop the Clock — stop the hidden timer as close to 5.00 seconds as you can.', 'M'],
  ['colorClash', 'Color Clash — tap the INK color, not the word. Most correct in 20 seconds.', 'M'],
  ['quickMath', 'Quick Math — most sums solved in 20 seconds.', 'M'],
  ['memory', 'Memory Sequence — repeat the growing color pattern. Longest wins.', 'H'],
];

export const MINIGAMES: Question[] = MINIGAME_NAMES.map(([id, prompt, difficulty]) => ({
  id: `minigame-${id}`,
  category: 'minigame',
  type: 'MINIGAME',
  difficulty,
  prompt,
  minigame: id,
}));

export const ALL_QUESTIONS: Question[] = [
  ...GEOGRAPHY,
  ...HISTORY,
  ...BASIC,
  ...POP_CULTURE,
  ...SPORTS,
  ...PHYSICAL,
  ...KNOW_YOUR_FRIENDS,
  ...PARTY,
  ...SPICY,
  ...MINIGAMES,
];

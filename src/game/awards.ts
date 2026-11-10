import type { GameState, PlayerTotals } from './engine';

/** Coins each award winner gets on top of their placing reward. */
export const AWARD_BONUS = 20;

export interface Award {
  id: string;
  title: string;
  emoji: string;
  description: string;
  playerId: string;
}

interface AwardDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  stat: (t: PlayerTotals) => number;
  partyOnly?: boolean;
}

const DEFS: AwardDef[] = [
  { id: 'oracle', title: 'Oracle', emoji: '🔮', description: 'Called the winner correctly more times than anyone', stat: (t) => t.correctBets },
  { id: 'whisperer', title: 'Underdog Whisperer', emoji: '🐶', description: 'Backed the most Underdogs who went on to win', stat: (t) => t.bonusBets },
  { id: 'slayer', title: 'Giant Slayer', emoji: '🗡️', description: 'Won the most face-offs as the Underdog', stat: (t) => t.giantSlays },
  { id: 'chaos', title: 'Chaos Agent', emoji: '🌀', description: 'Refused to pick a side the most (No Votes)', stat: (t) => t.noVotes },
  { id: 'liver', title: 'Iron Liver', emoji: '🍺', description: 'Took the most sips this game', stat: (t) => t.sips + t.shots * 3, partyOnly: true },
];

/** Fun end-of-game awards. Each goes to the single leader of its stat (no award on ties at zero). */
export function computeAwards(state: GameState): Award[] {
  const out: Award[] = [];
  for (const def of DEFS) {
    if (def.partyOnly && state.settings.mode !== 'party') continue;
    let best: string | undefined;
    let bestVal = 0;
    for (const p of state.players) {
      const v = def.stat(state.totals[p.id] ?? ({} as PlayerTotals)) || 0;
      if (v > bestVal) {
        best = p.id;
        bestVal = v;
      }
    }
    if (best) out.push({ id: def.id, title: def.title, emoji: def.emoji, description: def.description, playerId: best });
  }
  return out;
}

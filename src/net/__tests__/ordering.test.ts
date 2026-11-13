import type { GameState } from '@/game/engine';
import { compareStates } from '../ordering';

const players = [
  { id: 'h', joinOrder: 0 },
  { id: 'a', joinOrder: 1 },
  { id: 'b', joinOrder: 2 },
];
const st = (hostId: string, epoch: number, rev: number) => ({ hostId, epoch, rev, players } as unknown as GameState);

describe('compareStates (dropping late, duplicate and stale updates)', () => {
  it('a later change from the same host wins; an earlier one is dropped', () => {
    expect(compareStates(st('h', 0, 12), st('h', 0, 11))).toBeGreaterThan(0);
    expect(compareStates(st('h', 0, 10), st('h', 0, 11))).toBeLessThan(0);
  });
  it('a heartbeat of the same version is "equal"', () => {
    expect(compareStates(st('h', 0, 11), st('h', 0, 11))).toBe(0);
  });
  it('a new host (higher epoch) wins even with a lower rev', () => {
    expect(compareStates(st('a', 1, 3), st('h', 0, 400))).toBeGreaterThan(0);
    expect(compareStates(st('h', 0, 401), st('a', 1, 3))).toBeLessThan(0);
  });
  it('two takeovers in the same epoch: every phone picks the earlier joiner', () => {
    const fromA = st('a', 1, 50);
    const fromB = st('b', 1, 90);
    expect(compareStates(fromA, fromB)).toBeGreaterThan(0);
    expect(compareStates(fromB, fromA)).toBeLessThan(0);
  });
});

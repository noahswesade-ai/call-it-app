/** Lightens (amount > 0) or darkens (amount < 0) a #RRGGBB color. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// Input: scores for the same works, already filtered by visibility on the server.
export function compatibility(pairs, minimum = 5) {
  if (!Number.isInteger(minimum) || minimum < 1) throw new RangeError('Invalid minimum');
  if (pairs.some(([a,b]) => !Number.isFinite(a) || !Number.isFinite(b) || a<0 || a>10 || b<0 || b>10)) throw new RangeError('Scores must be between 0 and 10');
  if (pairs.length < minimum) return null;
  return Math.max(0, Math.min(100, Math.round(100 * (1-pairs.reduce((sum,[a,b])=>sum+Math.abs(a-b),0)/pairs.length/10))));
}

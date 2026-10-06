export function scoreWord(baseScore: number, combo: number): number {
  return baseScore + Math.min(50, Math.max(0, combo - 1) * 5)
}

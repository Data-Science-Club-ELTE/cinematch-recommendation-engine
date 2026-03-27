export function normalize(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

export function parseDateScore(dateString: string | null): number {
  if (!dateString) return 0;
  const release = new Date(dateString).getTime();
  if (Number.isNaN(release)) return 0;
  const now = Date.now();
  const years = Math.max(0, (now - release) / (1000 * 60 * 60 * 24 * 365));
  return Math.max(0, 1 - years / 25);
}

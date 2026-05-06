export interface ScoreLevel {
  label: string;
  color: string;
  bg: string;
}

// 1–3 = High concern (red), 4–7 = Moderate (amber), 8–10 = Low concern (green)
export function getScoreLevel(score: number | string): ScoreLevel {
  const n = Number(score);
  if (n < 4) return { label: 'High',     color: '#ef4444', bg: '#fef2f2' };
  if (n < 8) return { label: 'Moderate', color: '#f59e0b', bg: '#fffbeb' };
  return       { label: 'Low',      color: '#16a34a', bg: '#dcfce7' };
}

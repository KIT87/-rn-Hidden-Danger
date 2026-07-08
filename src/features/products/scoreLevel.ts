export interface ScoreLevel {
  label: string;
  color: string;
  bg: string;
}

// `score` is a risk level: 1 = Low risk (green), 2 = Moderate (amber), 3 = High risk (red).
export function getScoreLevel(score: number | string | null): ScoreLevel {
  if (score === null || score === '' || Number.isNaN(Number(score))) {
    return { label: 'Unknown', color: '#9ca3af', bg: '#f3f4f6' };
  }
  const n = Number(score);
  if (n <= 1)  return { label: 'Low',      color: '#16a34a', bg: '#dcfce7' };
  if (n === 2) return { label: 'Moderate', color: '#f59e0b', bg: '#fffbeb' };
  return         { label: 'High',     color: '#ef4444', bg: '#fef2f2' };
}

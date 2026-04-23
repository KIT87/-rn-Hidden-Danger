import { View } from 'react-native';
import { AppText } from '@/components/ui';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
}

function getStyle(score: number) {
  if (score <= 3) return { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' };
  if (score <= 6) return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Moderate' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'High' };
}

export function ScoreBadge({ score, showLabel = true }: ScoreBadgeProps) {
  const { bg, text, label } = getStyle(score);
  return (
    <View className={`self-start flex-row items-center gap-1 rounded-full px-2 py-0.5 ${bg}`}>
      <AppText variant="caption" className={`font-bold ${text}`}>{score}</AppText>
      {showLabel && <AppText variant="caption" className={text}>· {label}</AppText>}
    </View>
  );
}

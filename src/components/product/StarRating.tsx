import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  score: number;
  max?: number;
  size?: number;
  color?: string;
  onChange?: (score: number) => void;
}

export function StarRating({ score, max = 5, size = 20, color = '#f59e0b', onChange }: StarRatingProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < score;
        return onChange ? (
          <Pressable key={i} onPress={() => onChange(i + 1)} hitSlop={4}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? color : '#d1d5db'} />
          </Pressable>
        ) : (
          <Ionicons key={i} name={filled ? 'star' : 'star-outline'} size={size} color={filled ? color : '#d1d5db'} />
        );
      })}
    </View>
  );
}

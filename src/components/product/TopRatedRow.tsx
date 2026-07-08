import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { RiskScore } from './RiskScore';
import type { TopRatedProduct } from '@/features/products/types';

interface TopRatedRowProps {
  product: TopRatedProduct;
  onPress: () => void;
}

// Rich row: image, name + risk pill, brand, ★ average · N reviews, and the
// top review excerpt (up to 2 lines).
export function TopRatedRow({ product, onPress }: TopRatedRowProps) {
  const excerpt = product.review_highlight?.excerpt;

  return (
    <Pressable onPress={onPress} className="flex-row gap-3 py-3 active:opacity-70">
      <View className="rounded-xl overflow-hidden bg-gray-50 shrink-0" style={{ width: 56, height: 56 }}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color="#d1d5db" />
          </View>
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-start justify-between gap-2">
          <AppText variant="label" numberOfLines={2} className="flex-1">{product.name}</AppText>
          <RiskScore riskScore={product.risk_score} size="sm" />
        </View>

        <AppText variant="caption" className="text-gray-400" numberOfLines={1}>{product.brand_name}</AppText>

        <View className="flex-row items-center gap-1.5">
          <Ionicons name="star" size={12} color="#f59e0b" />
          <AppText variant="caption" style={{ color: '#b45309', fontWeight: '700' }}>
            {product.average_score !== null ? Number(product.average_score).toFixed(1) : '—'}
          </AppText>
          <AppText variant="caption" className="text-gray-400">
            · {product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'}
          </AppText>
        </View>

        {excerpt ? (
          <AppText variant="caption" className="text-gray-500 italic mt-0.5" numberOfLines={2}>
            “{excerpt}”
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

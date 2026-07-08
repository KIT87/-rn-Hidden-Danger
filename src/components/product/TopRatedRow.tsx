import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { RiskScore } from './RiskScore';
import type { TopRatedProduct } from '@/features/products/types';

interface TopRatedRowProps {
  product: TopRatedProduct;
  onPress: () => void;
  tone?: 'light' | 'glass';
}

// Rich row: image, name + risk pill, brand, ★ average · N reviews, and the
// top review excerpt (up to 2 lines).
export function TopRatedRow({ product, onPress, tone = 'light' }: TopRatedRowProps) {
  const glass = tone === 'glass';
  const excerpt = product.review_highlight?.excerpt;

  return (
    <Pressable onPress={onPress} className="flex-row gap-3 py-3 active:opacity-70">
      <View className="rounded-xl overflow-hidden shrink-0" style={{ width: 56, height: 56, backgroundColor: glass ? 'rgba(255,255,255,0.9)' : '#f9fafb' }}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color={glass ? '#c4b5fd' : '#d1d5db'} />
          </View>
        )}
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-start justify-between gap-2">
          <AppText variant="label" numberOfLines={2} className={`flex-1 ${glass ? 'text-white' : ''}`}>{product.name}</AppText>
          <RiskScore riskScore={product.risk_score} size="sm" />
        </View>

        <AppText variant="caption" className={glass ? 'text-white/55' : 'text-gray-400'} numberOfLines={1}>{product.brand_name}</AppText>

        <View className="flex-row items-center gap-1.5">
          <Ionicons name="star" size={12} color="#fbbf24" />
          <AppText variant="caption" style={{ color: glass ? '#fcd34d' : '#b45309', fontWeight: '700' }}>
            {product.average_score !== null ? Number(product.average_score).toFixed(1) : '—'}
          </AppText>
          <AppText variant="caption" className={glass ? 'text-white/50' : 'text-gray-400'}>
            · {product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'}
          </AppText>
        </View>

        {excerpt ? (
          <AppText variant="caption" className={`italic mt-0.5 ${glass ? 'text-white/60' : 'text-gray-500'}`} numberOfLines={2}>
            “{excerpt}”
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { RiskScore } from './RiskScore';
import type { ProductSummary } from '@/features/products/types';

// Minimal shape ProductSummary, TopRatedProduct and SimilarProduct all satisfy.
// brand_name is optional — the similar-products endpoint omits it.
type CardProduct = Pick<ProductSummary, 'product_id' | 'name' | 'risk_score' | 'image_url'> & {
  brand_name?: string;
  images?: string[];
};

interface ProductCardProps {
  product: CardProduct;
  onPress?: () => void;
  /** 'light' = white card (default), 'glass' = frosted card over the gradient. */
  tone?: 'light' | 'glass';
  /** Card width (defaults to 168 for carousels; pass a computed half-width for grids). */
  width?: number;
  /** Optional star rating shown under the risk pill (used on Top Picks). */
  rating?: { score: number | null; count: number };
}

// Compact review count: 2340 → "2.3k".
function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
}

export function ProductCard({ product, onPress, tone = 'light', width = 168, rating }: ProductCardProps) {
  const glass = tone === 'glass';
  const img = product.image_url ?? product.images?.[0];

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl overflow-hidden active:opacity-80 ${glass ? '' : 'bg-white border border-gray-100'}`}
      style={
        glass
          ? { width, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }
          : { width }
      }
    >
      {img ? (
        <Image
          source={{ uri: img }}
          style={{ width: '100%', height: 140, backgroundColor: glass ? '#ffffff' : '#f9fafb' }}
          resizeMode="contain"
        />
      ) : (
        <View
          className="w-full items-center justify-center"
          style={{ height: 140, backgroundColor: glass ? 'rgba(255,255,255,0.9)' : '#f9fafb' }}
        >
          <Ionicons name="cube-outline" size={36} color="#d1d5db" />
        </View>
      )}
      <View className="p-3 gap-1.5">
        <AppText variant="label" numberOfLines={2} className={glass ? 'text-white' : ''}>
          {product.name}
        </AppText>
        {product.brand_name ? (
          <AppText variant="caption" numberOfLines={1} className={glass ? 'text-white/60' : 'text-gray-400'}>
            {product.brand_name}
          </AppText>
        ) : null}
        <View className="mt-0.5 flex-row items-center justify-between">
          <RiskScore riskScore={product.risk_score} size="sm" />
          {rating && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={12} color="#fbbf24" />
              <AppText
                variant="caption"
                style={{ fontWeight: '700' }}
                className={glass ? 'text-white' : 'text-amber-700'}
              >
                {rating.score !== null ? Number(rating.score).toFixed(1) : '—'}
              </AppText>
              {rating.count > 0 && (
                <AppText variant="caption" className={glass ? 'text-white/50' : 'text-gray-400'}>
                  ({compactCount(rating.count)})
                </AppText>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

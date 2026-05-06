import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { ScoreBadge } from './ScoreBadge';
import { StarRating } from './StarRating';
import type { ProductSummary } from '@/features/products/types';

interface ProductCardProps {
  product: ProductSummary;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:opacity-75"
      style={{ width: 168 }}
    >
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={{ width: '100%', height: 120, backgroundColor: '#f9fafb' }}
          resizeMode="contain"
        />
      ) : (
        <View className="w-full bg-gray-50 items-center justify-center" style={{ height: 120 }}>
          <Ionicons name="cube-outline" size={36} color="#d1d5db" />
        </View>
      )}
      <View className="p-3 gap-1.5">
        <AppText variant="label" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="caption" numberOfLines={1} className="text-gray-400">
          {product.brand_name}
        </AppText>
        <View className="flex-row items-center justify-between">
          <ScoreBadge score={product.score} />
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="crown" size={11} color="#f59e0b" />
            <AppText variant="caption" className="text-gray-400">{product.picks_count ?? 0}</AppText>
          </View>
        </View>
        {product.reviews_count > 0 && product.average_score !== null && (
          <View className="flex-row items-center gap-1 pt-0.5">
            <StarRating score={Math.round(Number(product.average_score))} size={10} />
            <AppText variant="caption" className="text-gray-400">
              {Number(product.average_score).toFixed(1)}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

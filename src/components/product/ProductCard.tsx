import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { ScoreBadge } from './ScoreBadge';
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
        <ScoreBadge score={product.score} />
      </View>
    </Pressable>
  );
}

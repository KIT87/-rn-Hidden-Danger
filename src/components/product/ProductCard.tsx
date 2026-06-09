import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { getScoreLevel } from '@/features/products/scoreLevel';
import type { ProductSummary } from '@/features/products/types';

interface ProductCardProps {
  product: ProductSummary;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const level = getScoreLevel(product.score);
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:opacity-75"
      style={{ width: 168 }}
    >
      {product.images[0]?.url ? (
        <Image
          source={{ uri: product.images[0].url }}
          style={{ width: '100%', height: 140, backgroundColor: '#f9fafb' }}
          resizeMode="contain"
        />
      ) : (
        <View className="w-full bg-gray-50 items-center justify-center" style={{ height: 140 }}>
          <Ionicons name="cube-outline" size={36} color="#d1d5db" />
        </View>
      )}
      <View className="p-3 gap-1.5">
        <AppText variant="label" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="caption" numberOfLines={1} className="text-gray-400">
          {product.brand_name}
        </AppText>
        <View className="flex-row items-center gap-2 mt-0.5">
          <AppText style={{ fontWeight: '800', fontSize: 15, color: level.color }}>
            {Number(product.score).toFixed(1)}
          </AppText>
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: level.bg }}>
            <AppText variant="caption" style={{ color: level.color, fontWeight: '600', fontSize: 10 }}>
              {level.label}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { RiskScore } from './RiskScore';
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
      {product.image_url ?? product.images[0] ? (
        <Image
          source={{ uri: product.image_url ?? product.images[0] }}
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
        <View className="mt-0.5">
          <RiskScore riskScore={product.risk_score} size="sm" />
        </View>
      </View>
    </Pressable>
  );
}

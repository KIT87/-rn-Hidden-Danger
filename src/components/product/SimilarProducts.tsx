import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { useSimilarProducts } from '@/features/products/useSimilarProducts';
import { ProductCard } from './ProductCard';

const CARD_GAP = 12;

// Horizontal carousel of safer alternatives to the current product, modelled on
// the home "Top rated" section. Renders nothing when there are no alternatives.
export function SimilarProducts({ productId }: { productId: number }) {
  const { data, isLoading } = useSimilarProducts(productId);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name="leaf" size={16} color="#86efac" />
        <AppText variant="heading" className="text-white">Similar products</AppText>
      </View>
      <AppText variant="caption" className="text-white/55 -mt-1">
        Safer alternatives with a lower risk score
      </AppText>

      {isLoading && !data ? (
        <ActivityIndicator color="#ffffff" className="py-6" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
        >
          {data!.map((p) => (
            <ProductCard
              key={p.product_id}
              product={p}
              tone="glass"
              onPress={() => router.push(`/product/${p.product_id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

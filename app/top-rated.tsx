import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { TopRatedRow } from '@/components/product';
import { useTopRated } from '@/features/products/useTopRated';

export default function TopRatedScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useTopRated();

  return (
    <AppScreen
      scroll
      className="gap-4"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#7c3aed" colors={['#7c3aed']} />}
    >
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <AppText variant="heading">Top Rated</AppText>
      </View>

      <AppText variant="caption" className="text-gray-400">
        Highest-rated products by verified reviews.
      </AppText>

      {isLoading && <ActivityIndicator color="#7c3aed" className="py-16" />}

      {!isLoading && (!data || data.length === 0) && (
        <View className="flex-1 items-center justify-center gap-3 py-16">
          <View className="w-16 h-16 rounded-3xl bg-amber-50 items-center justify-center">
            <Ionicons name="star" size={30} color="#f59e0b" />
          </View>
          <AppText variant="heading">No top rated products yet</AppText>
          <AppText variant="body" className="text-gray-400 text-center">
            Products need a few reviews before they appear here.
          </AppText>
        </View>
      )}

      {data && data.length > 0 && (
        <AppCard>
          <View className="divide-y divide-gray-100">
            {data.map((product) => (
              <TopRatedRow
                key={product.product_id}
                product={product}
                onPress={() => router.push(`/product/${product.product_id}` as never)}
              />
            ))}
          </View>
        </AppCard>
      )}
    </AppScreen>
  );
}

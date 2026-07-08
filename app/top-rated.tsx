import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { TopRatedRow } from '@/components/product';
import { useTopRatedPaged } from '@/features/products/useTopRated';

export default function TopRatedScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopRatedPaged();

  const items = data?.pages.flatMap((p) => p ?? []) ?? [];

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Top Rated" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ffffff" colors={['#ffffff']} />}
      >
        <AppText variant="caption" className="text-white/60">
          Highest-rated products by verified reviews.
        </AppText>

        {isLoading && <ActivityIndicator color="#ffffff" className="py-16" />}

        {!isLoading && items.length === 0 && (
          <View className="flex-1 items-center justify-center gap-3 py-16">
            <View className="w-16 h-16 rounded-3xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Ionicons name="star" size={30} color="#fbbf24" />
            </View>
            <AppText variant="heading" className="text-white">No top rated products yet</AppText>
            <AppText variant="body" className="text-white/60 text-center">
              Products need a few reviews before they appear here.
            </AppText>
          </View>
        )}

        {items.length > 0 && (
          <AppCard glass>
            <View className="divide-y divide-white/10">
              {items.map((product) => (
                <TopRatedRow
                  key={product.product_id}
                  product={product}
                  tone="glass"
                  onPress={() => router.push(`/product/${product.product_id}` as never)}
                />
              ))}
            </View>
          </AppCard>
        )}

        {hasNextPage && (
          <Pressable
            onPress={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            {isFetchingNextPage ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="chevron-down" size={15} color="#ffffff" />
                <AppText variant="caption" className="text-white font-semibold">Load more</AppText>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { ProductCard, SearchHistoryRow } from '@/components/product';
import { useFeaturedProducts } from '@/features/products/useFeaturedProducts';
import { useRecentlyViewed } from '@/features/products/useRecentlyViewed';
import { useSearchHistory } from '@/features/products/useSearchHistory';
import { productsApi } from '@/features/products/api';
import { useAuth } from '@/features/auth/AuthContext';

const INITIAL = 3;
const MAX = 10;

function CollapsibleHeader({
  icon,
  title,
  open,
  loading,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  open: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between" onPress={onToggle} hitSlop={8}>
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#6b7280" />
        <AppText variant="heading">{title}</AppText>
      </View>
      {loading
        ? <ActivityIndicator size="small" color="#16a34a" />
        : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
      }
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { nickname } = useAuth();

  const { products, initialLoading, loading: loadingMoreProducts, hasMore, reload, loadMore } = useFeaturedProducts();
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [recentlyViewedOpen, setRecentlyViewedOpen] = useState(false);
  const { data: recentlyViewed, isFetching: loadingRecentlyViewed, refetch: refetchRecentlyViewed } = useRecentlyViewed(recentlyViewedOpen);

  const [nameOpen, setNameOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const historyEnabled = nameOpen || scanOpen;
  const { data: history, isFetching: loadingHistory, refetch: refetchHistory } = useSearchHistory(historyEnabled);

  const [refreshing, setRefreshing] = useState(false);
  const [moreRecentlyViewed, setMoreRecentlyViewed] = useState(false);

  const [moreSearches, setMoreSearches] = useState(false);
  const [moreScans, setMoreScans] = useState(false);
  const [loadingEan, setLoadingEan] = useState<string | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    const promises: Promise<unknown>[] = [reload()];
    if (recentlyViewedOpen) promises.push(refetchRecentlyViewed());
    if (historyEnabled) promises.push(refetchHistory());
    await Promise.all(promises);
    setRefreshing(false);
  }

  async function openEanResult(ean: string) {
    setLoadingEan(ean);
    try {
      const results = await productsApi.searchByEan(ean);
      if (results && results.length > 0) {
        router.push(`/product/${results[0].product_id}` as never);
      } else {
        router.push({ pathname: '/search/ean', params: { code: ean } });
      }
    } catch {
      router.push({ pathname: '/search/ean', params: { code: ean } });
    } finally {
      setLoadingEan(null);
    }
  }

  const nameSearches = history?.filter((h) => h.query_type === 'name') ?? [];
  const eanScans = history?.filter((h) => h.query_type === 'ean') ?? [];

  const visibleRecentlyViewed = (recentlyViewed ?? []).slice(0, moreRecentlyViewed ? MAX : INITIAL);
  const visibleSearches = nameSearches.slice(0, moreSearches ? MAX : INITIAL);
  const visibleScans = eanScans.slice(0, moreScans ? MAX : INITIAL);

  return (
    <AppScreen
      scroll
      className="gap-6 pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" colors={['#16a34a']} />}
    >
      {/* Greeting */}
      <View className="pt-2 gap-1">
        <AppText variant="title">Hi, {nickname ?? 'there'} 👋</AppText>
        <AppText variant="body" className="text-gray-500">
          What are you checking today?
        </AppText>
      </View>

      {/* Quick actions */}
      <Pressable
        onPress={() => router.navigate('/(tabs)/scan')}
        className="items-center gap-3 bg-primary-600 rounded-3xl px-6 py-6 active:bg-primary-700"
      >
        <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
          <Ionicons name="scan" size={30} color="white" />
        </View>
        <View className="items-center gap-1">
          <AppText variant="label" className="text-white font-bold text-lg tracking-wide">
            FIND PRODUCT
          </AppText>
          <AppText variant="caption" className="text-white/70">
            Scan, search by name or EAN
          </AppText>
        </View>
      </Pressable>

      {/* Discover */}
      <View>
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center gap-2">
            <Ionicons name="compass-outline" size={16} color="#6b7280" />
            <AppText variant="heading">Discover</AppText>
          </View>
          {hasMore && (
            <Pressable onPress={() => loadMore(products.length)} hitSlop={8} disabled={loadingMoreProducts}>
              {loadingMoreProducts
                ? <ActivityIndicator size="small" color="#16a34a" />
                : <AppText variant="caption" className="text-primary-600 font-semibold">More</AppText>
              }
            </Pressable>
          )}
        </View>
        {initialLoading ? (
          <ActivityIndicator color="#16a34a" className="py-6" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onPress={() => router.push(`/product/${product.product_id}` as never)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recently viewed */}
      <AppCard>
        <CollapsibleHeader
          icon="eye-outline"
          title="Recently viewed"
          open={recentlyViewedOpen}
          loading={recentlyViewedOpen && loadingRecentlyViewed}
          onToggle={() => setRecentlyViewedOpen((v) => !v)}
        />
        {recentlyViewedOpen && (
          <View className="mt-3">
            {!recentlyViewed ? (
              <ActivityIndicator color="#16a34a" className="py-4" />
            ) : recentlyViewed.length === 0 ? (
              <AppText variant="caption" className="text-gray-400 py-3">No recently viewed products</AppText>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="-mx-4"
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                >
                  {visibleRecentlyViewed.map((product) => (
                    <ProductCard
                      key={product.product_id}
                      product={product}
                      onPress={() => router.push(`/product/${product.product_id}` as never)}
                    />
                  ))}
                </ScrollView>
                {recentlyViewed.length > INITIAL && (
                  <Pressable onPress={() => setMoreRecentlyViewed((v) => !v)} hitSlop={8} className="pt-3">
                    <AppText variant="caption" className="text-primary-600 font-semibold">
                      {moreRecentlyViewed ? 'Show less' : `${recentlyViewed.length - INITIAL} more`}
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>

      {/* Recent name searches */}
      <AppCard>
        <CollapsibleHeader
          icon="time-outline"
          title="Recent searches"
          open={nameOpen}
          loading={nameOpen && loadingHistory}
          onToggle={() => setNameOpen((v) => !v)}
        />
        {nameOpen && (
          <View className="mt-2">
            {!history ? (
              <ActivityIndicator color="#16a34a" className="py-4" />
            ) : nameSearches.length === 0 ? (
              <AppText variant="caption" className="text-gray-400 py-3">No recent searches</AppText>
            ) : (
              <>
                <View className="divide-y divide-gray-100">
                  {visibleSearches.map((item, i) => (
                    <SearchHistoryRow
                      key={i}
                      item={item}
                      onPress={() =>
                        router.push(`/search/name?query=${encodeURIComponent(item.query)}` as never)
                      }
                    />
                  ))}
                </View>
                {nameSearches.length > INITIAL && (
                  <Pressable onPress={() => setMoreSearches((v) => !v)} hitSlop={8} className="pt-2">
                    <AppText variant="caption" className="text-primary-600 font-semibold">
                      {moreSearches ? 'Show less' : `${nameSearches.length - INITIAL} more`}
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>

      {/* Recently scanned */}
      <AppCard>
        <CollapsibleHeader
          icon="barcode-outline"
          title="Recently scanned"
          open={scanOpen}
          loading={scanOpen && loadingHistory}
          onToggle={() => setScanOpen((v) => !v)}
        />
        {scanOpen && (
          <View className="mt-2">
            {!history ? (
              <ActivityIndicator color="#16a34a" className="py-4" />
            ) : eanScans.length === 0 ? (
              <AppText variant="caption" className="text-gray-400 py-3">No recent scans</AppText>
            ) : (
              <>
                <View className="divide-y divide-gray-100">
                  {visibleScans.map((item, i) => (
                    <SearchHistoryRow
                      key={i}
                      item={item}
                      loading={loadingEan === item.query}
                      onPress={() =>
                        item.product_found
                          ? openEanResult(item.query)
                          : router.push({ pathname: '/search/ean', params: { code: item.query } })
                      }
                    />
                  ))}
                </View>
                {eanScans.length > INITIAL && (
                  <Pressable onPress={() => setMoreScans((v) => !v)} hitSlop={8} className="pt-2">
                    <AppText variant="caption" className="text-primary-600 font-semibold">
                      {moreScans ? 'Show less' : `${eanScans.length - INITIAL} more`}
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>
    </AppScreen>
  );
}

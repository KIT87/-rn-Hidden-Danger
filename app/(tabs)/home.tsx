import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { ProductCard, SearchHistoryRow } from '@/components/product';
import { useFeaturedProducts } from '@/features/products/useFeaturedProducts';
import { useRecentlyViewed } from '@/features/products/useRecentlyViewed';
import { useSearchHistory } from '@/features/products/useSearchHistory';
import { productsApi } from '@/features/products/api';
import { getScoreLevel } from '@/features/products/scoreLevel';
import { useAuth } from '@/features/auth/AuthContext';
import type { ProductSummary } from '@/features/products/types';

const CARD_WIDTH = 168;
const CARD_GAP = 12;
const INITIAL = 3;
const MAX = 10;

// ─── Product list row (for vertical sections) ─────────────────────────────────

function ProductRow({ product, onPress }: { product: ProductSummary; onPress: () => void }) {
  const level = getScoreLevel(product.score);
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:bg-gray-50">
      <View className="rounded-xl overflow-hidden bg-gray-50 shrink-0" style={{ width: 56, height: 56 }}>
        {product.images[0]?.url ? (
          <Image source={{ uri: product.images[0].url }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color="#d1d5db" />
          </View>
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="label" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="caption" className="text-gray-400">{product.brand_name}</AppText>
      </View>
      <View className="items-end gap-1">
        <AppText style={{ fontWeight: '800', fontSize: 15, color: level.color }}>
          {Number(product.score).toFixed(1)}
        </AppText>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: level.bg }}>
          <AppText variant="caption" style={{ color: level.color, fontWeight: '600', fontSize: 10 }}>
            {level.label}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Collapsible section header ───────────────────────────────────────────────

function CollapsibleHeader({
  icon,
  title,
  open,
  loading,
  count,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  open: boolean;
  loading: boolean;
  count?: number;
  onToggle: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between" onPress={onToggle} hitSlop={8}>
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#6b7280" />
        <AppText variant="heading">{title}</AppText>
      </View>
      <View className="flex-row items-center gap-2">
        {count !== undefined && (
          <View className="rounded-full bg-gray-100 px-2.5 py-0.5 min-w-[24px] items-center">
            <AppText variant="caption" className="text-gray-500 font-semibold">{count}</AppText>
          </View>
        )}
        {loading
          ? <ActivityIndicator size="small" color="#7c3aed" />
          : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
        }
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { nickname } = useAuth();

  const { products, initialLoading, loading: loadingMoreProducts, hasMore, reload, loadMore } = useFeaturedProducts();
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll Discover to first newly loaded product
  const discoverRef = useRef<ScrollView>(null);
  const prevProductCount = useRef(0);
  useEffect(() => {
    if (products.length > prevProductCount.current && prevProductCount.current > 0) {
      discoverRef.current?.scrollTo({
        x: prevProductCount.current * (CARD_WIDTH + CARD_GAP),
        animated: true,
      });
    }
    prevProductCount.current = products.length;
  }, [products.length]);

  const [recentlyViewedOpen, setRecentlyViewedOpen] = useState(false);
  const { data: recentlyViewed, isFetching: loadingRecentlyViewed, refetch: refetchRecentlyViewed } = useRecentlyViewed(recentlyViewedOpen);

  const [nameOpen, setNameOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const historyEnabled = nameOpen || scanOpen;
  const { data: history, isFetching: loadingHistory, refetch: refetchHistory } = useSearchHistory(historyEnabled);

  const [refreshing, setRefreshing] = useState(false);
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
      const response = await productsApi.searchByEan(ean);
      if (response !== null && response.match_type === 'exact') {
        router.push(`/product/${response.results[0].product_id}` as never);
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
  const visibleSearches = nameSearches.slice(0, moreSearches ? MAX : INITIAL);
  const visibleScans = eanScans.slice(0, moreScans ? MAX : INITIAL);

  return (
    <AppScreen
      scroll
      className="gap-5 pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" colors={['#7c3aed']} />}
    >
      {/* Greeting */}
      <View className="pt-2 gap-1">
        <AppText variant="title">Hi, {nickname ?? 'there'} 👋</AppText>
        <AppText variant="body" className="text-gray-500">
          What are you checking today?
        </AppText>
      </View>

      {/* Find Product card */}
      <View className="gap-3">
        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          className="flex-row items-center gap-4 rounded-3xl px-5 py-5 active:opacity-90"
          style={{ backgroundColor: '#7c3aed' }}
        >
          <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Ionicons name="scan-outline" size={24} color="white" />
          </View>
          <View className="flex-1 gap-0.5">
            <AppText variant="label" style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
              Find Product
            </AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Scan, search by name or EAN
            </AppText>
          </View>
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <Ionicons name="chevron-forward" size={18} color="white" />
          </View>
        </Pressable>

        {/* Static pagination dots */}
        <View className="flex-row items-center justify-center gap-1.5">
          <View className="w-5 h-1.5 rounded-full bg-gray-400" />
          <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
          <View className="w-1.5 h-1.5 rounded-full bg-gray-200" />
        </View>
      </View>

      {/* Search bar */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push('/search/name' as never)}
          className="flex-1 flex-row items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-gray-100"
          style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 }}
        >
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <AppText variant="caption" className="text-gray-400 flex-1">Search product name...</AppText>
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          className="w-11 h-11 rounded-2xl items-center justify-center active:opacity-80"
          style={{ backgroundColor: '#7c3aed' }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="white" />
        </Pressable>
      </View>

      {/* Discover */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="star-four-points" size={16} color="#7c3aed" />
            <AppText variant="heading">Discover</AppText>
          </View>
          {hasMore && (
            <Pressable onPress={() => loadMore(products.length)} hitSlop={8} disabled={loadingMoreProducts}>
              {loadingMoreProducts
                ? <ActivityIndicator size="small" color="#7c3aed" />
                : <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '600' }}>More</AppText>
              }
            </Pressable>
          )}
        </View>

        {initialLoading ? (
          <ActivityIndicator color="#7c3aed" className="py-6" />
        ) : (
          <ScrollView
            ref={discoverRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
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
          count={recentlyViewed?.length}
          onToggle={() => setRecentlyViewedOpen((v) => !v)}
        />
        {recentlyViewedOpen && (
          <View className="mt-3">
            {!recentlyViewed ? (
              <ActivityIndicator color="#7c3aed" className="py-4" />
            ) : recentlyViewed.length === 0 ? (
              <AppText variant="caption" className="text-gray-400 py-3">No recently viewed products</AppText>
            ) : (
              <View className="divide-y divide-gray-100">
                {recentlyViewed.map((product) => (
                  <ProductRow
                    key={product.product_id}
                    product={product}
                    onPress={() => router.push(`/product/${product.product_id}` as never)}
                  />
                ))}
              </View>
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
          count={history ? nameSearches.length : undefined}
          onToggle={() => setNameOpen((v) => !v)}
        />
        {nameOpen && (
          <View className="mt-2">
            {!history ? (
              <ActivityIndicator color="#7c3aed" className="py-4" />
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
                    <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '600' }}>
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
          count={history ? eanScans.length : undefined}
          onToggle={() => setScanOpen((v) => !v)}
        />
        {scanOpen && (
          <View className="mt-2">
            {!history ? (
              <ActivityIndicator color="#7c3aed" className="py-4" />
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
                    <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '600' }}>
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

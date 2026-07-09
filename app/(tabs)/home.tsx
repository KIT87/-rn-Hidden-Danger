import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { ProductCard, RiskScore } from '@/components/product';
import { GLASS } from '@/theme/glass';
import { useFeaturedProducts } from '@/features/products/useFeaturedProducts';
import { useRecentlyViewed } from '@/features/products/useRecentlyViewed';
import { useTopRated } from '@/features/products/useTopRated';
import { useProfile } from '@/features/products/useProfile';
import { useDailyAppOpen } from '@/features/gamification/useActivity';
import { useAuth } from '@/features/auth/AuthContext';
import type { ProductSummary } from '@/features/products/types';

const CARD_WIDTH = 168;
const CARD_GAP = 12;

// ─── Product list row (for vertical sections) ─────────────────────────────────

function ProductRow({ product, onPress }: { product: ProductSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:opacity-70">
      <View className="rounded-xl overflow-hidden shrink-0" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.9)' }}>
        {product.image_url ?? product.images[0] ? (
          <Image source={{ uri: product.image_url ?? product.images[0] }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color="#c4b5fd" />
          </View>
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="label" numberOfLines={2} className="text-white">{product.name}</AppText>
        <AppText variant="caption" className="text-white/55">{product.brand_name}</AppText>
      </View>
      <RiskScore riskScore={product.risk_score} size="sm" />
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
        <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
        <AppText variant="heading" className="text-white">{title}</AppText>
      </View>
      <View className="flex-row items-center gap-2">
        {count !== undefined && (
          <View className="rounded-full px-2.5 py-0.5 min-w-[24px] items-center" style={{ backgroundColor: GLASS.chipBg }}>
            <AppText variant="caption" className="text-white font-semibold">{count}</AppText>
          </View>
        )}
        {loading
          ? <ActivityIndicator size="small" color="#ffffff" />
          : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" />
        }
      </View>
    </Pressable>
  );
}

// ─── Section header (non-collapsible) ─────────────────────────────────────────

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">{children}</View>
      {action}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { nickname, token } = useAuth();
  const { toastConfig, showToast } = useToast();

  const { data: profile } = useProfile(!!token);
  useDailyAppOpen((streak) => showToast(`🔥 ${streak} day streak!`, 'success'));

  const { products, initialLoading, loading: loadingMoreProducts, hasMore, reload, loadMore } = useFeaturedProducts();
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: topRated, isLoading: loadingTopRated, refetch: refetchTopRated } = useTopRated();

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

  const [recentlyViewedOpen, setRecentlyViewedOpen] = useState(true); // expanded by default
  const { data: recentlyViewed, isFetching: loadingRecentlyViewed, refetch: refetchRecentlyViewed } = useRecentlyViewed(recentlyViewedOpen);

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    const promises: Promise<unknown>[] = [reload(), refetchTopRated()];
    if (recentlyViewedOpen) promises.push(refetchRecentlyViewed());
    await Promise.all(promises);
    setRefreshing(false);
  }

  return (
    <View className="flex-1">
    <AppScreen
      gradient
      scroll
      className="gap-5 pb-8"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" colors={['#ffffff']} />}
    >
      <StatusBar style="light" />

      {/* Greeting */}
      <View className="pt-2 flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="title" className="text-white">Hi, {nickname ?? 'there'} 👋</AppText>
          <AppText variant="body" className="text-white/70">
            What are you checking today?
          </AppText>
        </View>
        {profile && profile.current_streak > 0 && (
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as never)}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-2 active:opacity-70"
            style={{ backgroundColor: 'rgba(251,146,60,0.18)', borderWidth: 1, borderColor: 'rgba(251,146,60,0.35)' }}
          >
            <Ionicons name="flame" size={15} color="#fb923c" />
            <AppText variant="caption" className="font-extrabold" style={{ color: '#fb923c' }}>
              {profile.current_streak}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Find Product card */}
      <View className="gap-3">
        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          className="flex-row items-center gap-4 rounded-3xl px-5 py-5 active:opacity-90"
          style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
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
          <View className="w-5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }} />
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
        </View>
      </View>

      {/* Search bar */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push('/search/name' as never)}
          className="flex-1 flex-row items-center gap-2 rounded-2xl px-4 py-3"
          style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
        >
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <AppText variant="caption" className="text-white/60 flex-1">Search product name...</AppText>
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          className="w-11 h-11 rounded-2xl items-center justify-center active:opacity-80"
          style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="white" />
        </Pressable>
      </View>

      {/* My Top Picks */}
      {(loadingTopRated || (topRated && topRated.length > 0)) && (
        <View className="gap-3">
          <SectionHeader
            action={
              topRated && topRated.length > 5 ? (
                <Pressable onPress={() => router.push('/top-rated' as never)} hitSlop={8}>
                  <AppText variant="caption" className="text-white/90 font-semibold">See all</AppText>
                </Pressable>
              ) : undefined
            }
          >
            <Ionicons name="star" size={16} color="#fbbf24" />
            <AppText variant="heading" className="text-white">Top rated products</AppText>
          </SectionHeader>

          {loadingTopRated && !topRated ? (
            <ActivityIndicator color="#ffffff" className="py-6" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4"
              contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
            >
              {topRated!.slice(0, 5).map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  tone="glass"
                  rating={{ score: product.average_score, count: product.reviews_count }}
                  onPress={() => router.push(`/product/${product.product_id}` as never)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Discover */}
      <View className="gap-3">
        <SectionHeader
          action={
            hasMore ? (
              <Pressable onPress={() => loadMore(products.length)} hitSlop={8} disabled={loadingMoreProducts}>
                {loadingMoreProducts
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <AppText variant="caption" className="text-white/90 font-semibold">More</AppText>
                }
              </Pressable>
            ) : undefined
          }
        >
          <MaterialCommunityIcons name="star-four-points" size={16} color="#ffffff" />
          <AppText variant="heading" className="text-white">Discover</AppText>
        </SectionHeader>

        {initialLoading ? (
          <ActivityIndicator color="#ffffff" className="py-6" />
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
                tone="glass"
                onPress={() => router.push(`/product/${product.product_id}` as never)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recently viewed */}
      <AppCard glass>
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
              <ActivityIndicator color="#ffffff" className="py-4" />
            ) : recentlyViewed.length === 0 ? (
              <AppText variant="caption" className="text-white/50 py-3">No recently viewed products</AppText>
            ) : (
              <View className="divide-y divide-white/10">
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

      {/* See my activity → Hub */}
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/hub', params: { tab: 'activity' } } as never)}
        className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
        style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
      >
        <Ionicons name="pulse" size={16} color="#ffffff" />
        <AppText variant="label" className="text-white font-semibold">See my activity</AppText>
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </AppScreen>

      <AppToast config={toastConfig} />
    </View>
  );
}

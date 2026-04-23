import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { ProductCard, SearchHistoryRow } from '@/components/product';
import { useRandomProducts } from '@/features/products/useRandomProducts';
import { useSearchHistory } from '@/features/products/useSearchHistory';

const INITIAL = 3;
const MAX = 10;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeader({
  icon,
  title,
  total,
  expanded,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hidden = total - INITIAL;
  return (
    <View className="flex-row items-center justify-between mb-1">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#6b7280" />
        <AppText variant="heading">{title}</AppText>
      </View>
      {total > INITIAL && (
        <Pressable onPress={onToggle} hitSlop={8}>
          <AppText variant="caption" className="text-primary-600 font-semibold">
            {expanded ? 'Show less' : `${hidden} more`}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: randomProducts, isLoading: loadingProducts, refetch: refetchProducts } = useRandomProducts();
  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useSearchHistory();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchHistory()]);
    setRefreshing(false);
  }

  const [moreProducts, setMoreProducts] = useState(false);
  const [moreSearches, setMoreSearches] = useState(false);
  const [moreScans, setMoreScans] = useState(false);

  const nameSearches = history?.filter((h) => h.query_type === 'name') ?? [];
  const eanScans = history?.filter((h) => h.query_type === 'ean') ?? [];

  const visibleProducts = (randomProducts ?? []).slice(0, moreProducts ? MAX : INITIAL);
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
        <AppText variant="title">{getGreeting()} 👋</AppText>
        <AppText variant="body" className="text-gray-500">
          What are you checking today?
        </AppText>
      </View>

      {/* Quick actions */}
      <View className="gap-3">
        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          className="flex-row items-center gap-4 bg-primary-600 rounded-2xl px-5 py-4 active:bg-primary-700"
        >
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="scan" size={22} color="white" />
          </View>
          <View className="flex-1">
            <AppText variant="label" className="text-white font-semibold text-base">
              Scan barcode
            </AppText>
            <AppText variant="caption" className="text-white/70">
              Point camera at product
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push('/search/name' as never)}
            className="flex-1 flex-row items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-gray-100 active:bg-gray-50"
          >
            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="search-outline" size={16} color="#374151" />
            </View>
            <AppText variant="label">Search by name</AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/search/ean')}
            className="flex-1 flex-row items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-gray-100 active:bg-gray-50"
          >
            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="barcode-outline" size={16} color="#374151" />
            </View>
            <AppText variant="label">Enter EAN</AppText>
          </Pressable>
        </View>
      </View>

      {/* Discover */}
      <View>
        <SectionHeader
          icon="compass-outline"
          title="Discover"
          total={randomProducts?.length ?? 0}
          expanded={moreProducts}
          onToggle={() => setMoreProducts((v) => !v)}
        />
        {loadingProducts ? (
          <ActivityIndicator color="#16a34a" className="py-6" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onPress={() => router.push(`/product/${product.product_id}` as never)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent name searches */}
      {(loadingHistory || nameSearches.length > 0) && (
        <AppCard>
          <SectionHeader
            icon="time-outline"
            title="Recent searches"
            total={nameSearches.length}
            expanded={moreSearches}
            onToggle={() => setMoreSearches((v) => !v)}
          />
          {loadingHistory ? (
            <ActivityIndicator color="#16a34a" className="py-4" />
          ) : (
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
          )}
        </AppCard>
      )}

      {/* Recently scanned */}
      {(loadingHistory || eanScans.length > 0) && (
        <AppCard>
          <SectionHeader
            icon="barcode-outline"
            title="Recently scanned"
            total={eanScans.length}
            expanded={moreScans}
            onToggle={() => setMoreScans((v) => !v)}
          />
          {loadingHistory ? (
            <ActivityIndicator color="#16a34a" className="py-4" />
          ) : (
            <View className="divide-y divide-gray-100">
              {visibleScans.map((item, i) => (
                <SearchHistoryRow
                  key={i}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/search/ean',
                      params: { code: item.query },
                    })
                  }
                />
              ))}
            </View>
          )}
        </AppCard>
      )}
    </AppScreen>
  );
}

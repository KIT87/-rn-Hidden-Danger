import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { ProductCard } from '@/components/product';
import { GLASS } from '@/theme/glass';
import { productsApi } from '@/features/products/api';
import { catalogToSummary } from '@/features/products/searchMapper';
import type { ProductSummary } from '@/features/products/types';

const SEARCH_LIMIT = 10;
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.floor((SCREEN_W - 32 - 12) / 2); // 16px padding each side, 12px gap

export default function NameSearchScreen() {
  const router = useRouter();
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => productsApi.search({ name: value, limit: SEARCH_LIMIT }),
    onSuccess: (data) => {
      setResults(data ? data.products.map(catalogToSummary) : []);
      setHasMore(data?.truncated ?? false);
      setSearched(true);
    },
  });

  useEffect(() => {
    if (initialQuery) {
      setSearchedQuery(initialQuery);
      mutate(initialQuery);
    }
  }, []);

  function handleSearch() {
    if (!query.trim()) return;
    const trimmed = query.trim();
    setSearchedQuery(trimmed);
    setResults(null);
    setHasMore(false);
    setSearched(false);
    mutate(trimmed);
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore || !results) return;
    setLoadingMore(true);
    try {
      const data = await productsApi.search({
        name: searchedQuery,
        limit: SEARCH_LIMIT,
        offset: results.length,
      });
      if (data) {
        setResults((prev) => [...(prev ?? []), ...data.products.map(catalogToSummary)]);
        setHasMore(data.truncated);
      }
    } catch {
      // network errors surfaced globally
    } finally {
      setLoadingMore(false);
    }
  }

  const disabled = !query.trim();

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Search by name" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search field */}
        <View className="gap-2">
          <AppText variant="caption" className="text-white/70 font-medium" style={{ letterSpacing: 0.5 }}>
            Product name
          </AppText>
          <View
            className="flex-row items-center gap-2.5 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. CeraVe Moisturizing Cream"
              placeholderTextColor="rgba(255,255,255,0.45)"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={!initialQuery}
              className="flex-1"
              style={{ color: '#ffffff', fontSize: 15, paddingVertical: 0 }}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleSearch}
            disabled={disabled || isPending}
            className={`flex-row items-center justify-center rounded-2xl py-4 active:opacity-80 ${disabled ? 'opacity-50' : ''}`}
            style={{ backgroundColor: '#7c3aed' }}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <AppText variant="label" className="text-white" style={{ fontWeight: '700', fontSize: 16 }}>Search</AppText>}
          </Pressable>
        </View>

        {searched && !isPending && (
          <View className="gap-3">
            {results === null || results.length === 0 ? (
              <View className="items-center py-10 gap-3">
                <Ionicons name="search-circle-outline" size={48} color="rgba(255,255,255,0.4)" />
                <AppText variant="body" className="text-white/60 text-center">
                  No products found for "{searchedQuery}".
                </AppText>
              </View>
            ) : (
              <>
                <AppText variant="caption" className="text-white/60">
                  {results.length} result{results.length !== 1 ? 's' : ''}{hasMore ? '+' : ''} found
                </AppText>
                <View className="flex-row flex-wrap gap-3">
                  {results.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      product={p}
                      tone="glass"
                      width={CARD_W}
                      onPress={() => router.push(`/product/${p.product_id}` as never)}
                    />
                  ))}
                </View>

                {hasMore && (
                  <Pressable
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
                    style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="chevron-down" size={15} color="#ffffff" />
                        <AppText variant="caption" className="text-white font-semibold">Load more</AppText>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

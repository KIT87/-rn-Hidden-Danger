import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppButton, AppHeader, AppInput, AppText } from '@/components/ui';
import { ProductCard } from '@/components/product';
import { productsApi } from '@/features/products/api';
import { catalogToSummary } from '@/features/products/searchMapper';
import type { ProductSummary } from '@/features/products/types';

const SEARCH_LIMIT = 10;

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader
        title="Search by name"
        left={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <AppInput
            label="Product name"
            placeholder="e.g. CeraVe Moisturizing Cream"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus={!initialQuery}
          />
          <AppButton
            label="Search"
            onPress={handleSearch}
            loading={isPending}
            disabled={!query.trim()}
          />
        </View>

        {isPending && <ActivityIndicator color="#7c3aed" />}

        {searched && !isPending && (
          <View className="gap-3">
            {results === null || results.length === 0 ? (
              <View className="items-center py-10 gap-3">
                <Ionicons name="search-circle-outline" size={48} color="#d1d5db" />
                <AppText variant="body" className="text-gray-400 text-center">
                  No products found for "{query}".
                </AppText>
              </View>
            ) : (
              <>
                <AppText variant="caption" className="text-gray-400">
                  {results.length} result{results.length !== 1 ? 's' : ''}{hasMore ? '+' : ''} found
                </AppText>
                <View className="flex-row flex-wrap gap-3">
                  {results.map((p) => (
                    <ProductCard
                      key={p.product_id}
                      product={p}
                      onPress={() => router.push(`/product/${p.product_id}` as never)}
                    />
                  ))}
                </View>

                {hasMore && (
                  <Pressable
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    className="flex-row items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3.5 active:bg-gray-50"
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <>
                        <Ionicons name="chevron-down" size={15} color="#7c3aed" />
                        <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '600' }}>
                          Load more
                        </AppText>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

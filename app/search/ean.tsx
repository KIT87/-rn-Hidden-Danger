import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppButton, AppHeader, AppInput, AppText } from '@/components/ui';
import { ProductCard } from '@/components/product';
import { productsApi } from '@/features/products/api';
import type { ProductSummary } from '@/features/products/types';

export default function EanSearchScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [ean, setEan] = useState(code ?? '');
  const [searchedEan, setSearchedEan] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isPrefix, setIsPrefix] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => productsApi.searchByEan(value),
    onSuccess: (data) => {
      if (data === null) {
        setResults([]);
        setTotal(null);
        setIsPrefix(false);
        setSearched(true);
        return;
      }
      if (data.match_type === 'exact') {
        router.replace(`/product/${data.results[0].product_id}` as never);
        return;
      }
      setResults(data.results);
      setTotal(data.total);
      setIsPrefix(true);
      setSearched(true);
    },
  });

  useEffect(() => {
    if (code) {
      setSearchedEan(code);
      mutate(code);
    }
  }, []);

  function handleSearch() {
    if (!ean.trim()) return;
    const trimmed = ean.trim();
    setSearchedEan(trimmed);
    setResults([]);
    setTotal(null);
    setIsPrefix(false);
    setSearched(false);
    mutate(trimmed);
  }

  async function handleLoadMore() {
    if (loadingMore || !isPrefix) return;
    setLoadingMore(true);
    try {
      const data = await productsApi.searchByEan(searchedEan, results.length);
      if (data && data.match_type === 'prefix') {
        setResults((prev) => [...prev, ...data.results]);
      }
    } catch {
      // network errors surfaced globally
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = isPrefix && total !== null && results.length < total;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader
        title="Enter barcode"
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
            label="Barcode number"
            placeholder="e.g. 012044009285"
            keyboardType="number-pad"
            value={ean}
            onChangeText={setEan}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <AppButton
            label="Search"
            onPress={handleSearch}
            loading={isPending}
            disabled={!ean.trim()}
          />
        </View>

        {isPending && <ActivityIndicator color="#7c3aed" />}

        {searched && !isPending && (
          <View className="gap-3">

            {/* Similar products banner */}
            {isPrefix && results.length > 0 && (
              <View className="flex-row items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <Ionicons name="information-circle" size={18} color="#d97706" style={{ marginTop: 1 }} />
                <AppText variant="caption" className="flex-1 text-amber-700">
                  No exact match found. Showing similar products from the same brand.
                </AppText>
              </View>
            )}

            {results.length === 0 ? (
              <View className="items-center py-10 gap-4">
                <View className="w-24 h-24 rounded-full bg-red-50 items-center justify-center">
                  <Ionicons name="barcode-outline" size={44} color="#fca5a5" />
                </View>
                <View className="items-center gap-2">
                  <AppText variant="heading" className="text-gray-900 text-center">
                    Product not found
                  </AppText>
                  <AppText variant="body" className="text-gray-500 text-center">
                    No product matched this barcode
                  </AppText>
                  <View className="bg-gray-100 rounded-xl px-4 py-2 mt-1">
                    <AppText variant="caption" className="text-gray-400 text-center font-mono">
                      {ean}
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <AppText variant="caption" className="text-gray-400">
                  {total !== null
                    ? `${total} similar product${total !== 1 ? 's' : ''}`
                    : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
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
                          Load more · {total! - results.length} remaining
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

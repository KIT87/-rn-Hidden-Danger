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
import { catalogToSummary, findExactGtinMatch } from '@/features/products/searchMapper';
import type { ProductSummary } from '@/features/products/types';

const SEARCH_LIMIT = 10;
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.floor((SCREEN_W - 32 - 12) / 2);

export default function EanSearchScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [ean, setEan] = useState(code ?? '');
  const [searchedEan, setSearchedEan] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => productsApi.search({ ean: value, limit: SEARCH_LIMIT }),
    onSuccess: (data, value) => {
      if (!data || data.products.length === 0) {
        setResults([]);
        setHasMore(false);
        setSearched(true);
        return;
      }
      // Exact GTIN hit → jump straight to the product (replace so back doesn't
      // return to this loading screen).
      const exact = findExactGtinMatch(data.products, value);
      if (exact) {
        router.replace(`/product/${exact.product_id}` as never);
        return;
      }
      setResults(data.products.map(catalogToSummary));
      setHasMore(data.truncated);
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
    setHasMore(false);
    setSearched(false);
    mutate(trimmed);
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await productsApi.search({
        ean: searchedEan,
        limit: SEARCH_LIMIT,
        offset: results.length,
      });
      if (data) {
        setResults((prev) => [...prev, ...data.products.map(catalogToSummary)]);
        setHasMore(data.truncated);
      }
    } catch {
      // network errors surfaced globally
    } finally {
      setLoadingMore(false);
    }
  }

  const disabled = !ean.trim();

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Enter barcode" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Barcode field */}
        <View className="gap-2">
          <AppText variant="caption" className="text-white/70 font-medium" style={{ letterSpacing: 0.5 }}>
            Barcode number
          </AppText>
          <View
            className="flex-row items-center gap-2.5 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="barcode-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              value={ean}
              onChangeText={setEan}
              placeholder="e.g. 012044009285"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              className="flex-1"
              style={{ color: '#ffffff', fontSize: 15, paddingVertical: 0 }}
            />
            {ean.length > 0 && (
              <Pressable onPress={() => setEan('')} hitSlop={8}>
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
            {/* Similar products banner (shown whenever we fall back to a list) */}
            {results.length > 0 && (
              <View
                className="flex-row items-start gap-2.5 rounded-2xl px-4 py-3"
                style={{ backgroundColor: 'rgba(251,191,36,0.18)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' }}
              >
                <Ionicons name="information-circle" size={18} color="#fde68a" style={{ marginTop: 1 }} />
                <AppText variant="caption" className="flex-1" style={{ color: '#fde68a' }}>
                  No exact match found. Showing similar products.
                </AppText>
              </View>
            )}

            {results.length === 0 ? (
              <View className="items-center py-10 gap-4">
                <View className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
                  <Ionicons name="barcode-outline" size={44} color="#fca5a5" />
                </View>
                <View className="items-center gap-2">
                  <AppText variant="heading" className="text-white text-center">
                    Product not found
                  </AppText>
                  <AppText variant="body" className="text-white/60 text-center">
                    No product matched this barcode
                  </AppText>
                  <View className="rounded-xl px-4 py-2 mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                    <AppText variant="caption" className="text-white/70 text-center font-mono">
                      {searchedEan}
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <AppText variant="caption" className="text-white/60">
                  {results.length} similar product{results.length !== 1 ? 's' : ''}
                  {hasMore ? '+' : ''}
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

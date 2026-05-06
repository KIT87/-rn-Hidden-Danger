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

export default function NameSearchScreen() {
  const router = useRouter();
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [searched, setSearched] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => productsApi.searchByName(value),
    onSuccess: (data) => {
      setResults(data ?? []);
      setSearched(true);
    },
  });

  useEffect(() => {
    if (initialQuery) mutate(initialQuery);
  }, []);

  function handleSearch() {
    if (!query.trim()) return;
    mutate(query.trim());
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
                  {results.length} result{results.length !== 1 ? 's' : ''} found
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
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

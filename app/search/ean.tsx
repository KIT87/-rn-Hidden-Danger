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
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [searched, setSearched] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => productsApi.searchByEan(value),
    onSuccess: (data) => {
      setResults(data ?? []);
      setSearched(true);
    },
  });

  useEffect(() => {
    if (code) mutate(code);
  }, []);

  function handleSearch() {
    if (!ean.trim()) return;
    mutate(ean.trim());
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <AppHeader
        title="Enter EAN code"
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

        {isPending && (
          <ActivityIndicator color="#7c3aed" />
        )}

        {searched && !isPending && (
          <View className="gap-3">
            {results === null || results.length === 0 ? (
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

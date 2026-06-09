import { Image, Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen, AppText } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { ScoreBadge } from '@/components/product/ScoreBadge';
import { useTopPicks } from '@/features/products/useTopPicks';
import { useRemovePick } from '@/features/products/useRemovePick';
import type { ProductSummary } from '@/features/products/types';

export default function TopPicksScreen() {
  const router = useRouter();
  const { toastConfig, showToast } = useToast();
  const { data, isLoading, refetch, isRefetching } = useTopPicks();
  const { mutate: removePick } = useRemovePick({ onError: showToast });

  return (
    <View style={{ flex: 1 }}>
      <AppScreen
        scroll
        className="gap-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <AppText variant="heading">Top Picks</AppText>
        </View>

        {data && (
          <View className="flex-row items-center gap-1.5 bg-amber-50 rounded-2xl px-4 py-3">
            <MaterialCommunityIcons name="crown" size={16} color="#d97706" />
            <AppText variant="body" className="text-amber-800">
              <AppText variant="label" className="text-amber-800">{data.total_used}</AppText>
              {' / '}{data.limit} picks used
            </AppText>
          </View>
        )}

        {isLoading && (
          <View className="flex-1 items-center justify-center py-16">
            <AppText variant="body" className="text-gray-400">Loading...</AppText>
          </View>
        )}

        {!isLoading && data?.picks.length === 0 && (
          <View className="flex-1 items-center justify-center gap-4 py-16">
            <View className="w-16 h-16 rounded-3xl bg-amber-50 items-center justify-center">
              <MaterialCommunityIcons name="crown" size={32} color="#d97706" />
            </View>
            <View className="items-center gap-1">
              <AppText variant="heading">No picks yet</AppText>
              <AppText variant="body" className="text-gray-400 text-center">
                Save products you love by tapping the crown on any product page.
              </AppText>
            </View>
          </View>
        )}

        {data && data.picks.length > 0 && (
          <View className="gap-3">
            {data.picks.map((product) => (
              <PickRow
                key={product.product_id}
                product={product}
                onPress={() => router.push(`/product/${product.product_id}`)}
                onRemove={() => removePick(product.product_id)}
              />
            ))}
          </View>
        )}
      </AppScreen>

      <AppToast config={toastConfig} />
    </View>
  );
}

interface PickRowProps {
  product: ProductSummary;
  onPress: () => void;
  onRemove: () => void;
}

function PickRow({ product, onPress, onRemove }: PickRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 active:opacity-75"
    >
      {product.images[0]?.url ? (
        <Image
          source={{ uri: product.images[0].url }}
          style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#f9fafb' }}
          resizeMode="contain"
        />
      ) : (
        <View className="w-16 h-16 rounded-xl bg-gray-50 items-center justify-center">
          <Ionicons name="cube-outline" size={24} color="#d1d5db" />
        </View>
      )}

      <View className="flex-1 gap-1">
        <AppText variant="label" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="caption" className="text-gray-400" numberOfLines={1}>
          {product.brand_name}
        </AppText>
        <View className="flex-row items-center gap-2">
          <ScoreBadge score={product.score} showLabel={false} />
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="crown" size={11} color="#f59e0b" />
            <AppText variant="caption" className="text-gray-400">{product.picks_count}</AppText>
          </View>
        </View>
      </View>

      <Pressable
        onPress={(e) => { e.stopPropagation(); onRemove(); }}
        hitSlop={8}
        className="p-2 active:opacity-50"
      >
        <Ionicons name="trash-outline" size={18} color="#9ca3af" />
      </Pressable>
    </Pressable>
  );
}

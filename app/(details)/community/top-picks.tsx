import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { RiskScore } from '@/components/product/RiskScore';
import { GLASS } from '@/theme/glass';
import { useTopPicks } from '@/features/products/useTopPicks';
import { useRemovePick } from '@/features/products/useRemovePick';
import type { ProductSummary } from '@/features/products/types';

export default function TopPicksScreen() {
  const router = useRouter();
  const { toastConfig, showToast } = useToast();
  const { data, isLoading, refetch, isRefetching } = useTopPicks();
  const { mutate: removePick } = useRemovePick({ onError: showToast });

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Top Picks" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ffffff" colors={['#ffffff']} />}
      >
        {data && (
          <View className="flex-row items-center gap-1.5 rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(251,191,36,0.18)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' }}>
            <MaterialCommunityIcons name="crown" size={16} color="#fbbf24" />
            <AppText variant="body" style={{ color: '#fde68a' }}>
              <AppText variant="label" style={{ color: '#fde68a' }}>{data.total_used}</AppText>
              {' / '}{data.limit} picks used
            </AppText>
          </View>
        )}

        {isLoading && (
          <View className="flex-1 items-center justify-center py-16">
            <AppText variant="body" className="text-white/60">Loading...</AppText>
          </View>
        )}

        {!isLoading && data?.picks.length === 0 && (
          <View className="flex-1 items-center justify-center gap-4 py-16">
            <View className="w-16 h-16 rounded-3xl items-center justify-center" style={{ backgroundColor: 'rgba(251,191,36,0.2)' }}>
              <MaterialCommunityIcons name="crown" size={32} color="#fbbf24" />
            </View>
            <View className="items-center gap-1">
              <AppText variant="heading" className="text-white">No picks yet</AppText>
              <AppText variant="body" className="text-white/60 text-center">
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
      </ScrollView>

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
      className="flex-row items-center gap-3 rounded-2xl p-3 active:opacity-75"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
    >
      {product.image_url ?? product.images[0] ? (
        <Image
          source={{ uri: product.image_url ?? product.images[0] }}
          style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)' }}
          resizeMode="contain"
        />
      ) : (
        <View className="w-16 h-16 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Ionicons name="cube-outline" size={24} color="#c4b5fd" />
        </View>
      )}

      <View className="flex-1 gap-1">
        <AppText variant="label" className="text-white" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="caption" className="text-white/55" numberOfLines={1}>
          {product.brand_name}
        </AppText>
        <View className="flex-row items-center gap-2">
          <RiskScore riskScore={product.risk_score} size="sm" />
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="crown" size={11} color="#fbbf24" />
            <AppText variant="caption" className="text-white/55">{product.picks_count}</AppText>
          </View>
        </View>
      </View>

      <Pressable
        onPress={(e) => { e.stopPropagation(); onRemove(); }}
        hitSlop={8}
        className="p-2 active:opacity-50"
      >
        <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </Pressable>
  );
}

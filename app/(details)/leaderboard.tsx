import { ActivityIndicator, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { LeaderRow, Podium } from '@/components/leaderboard/parts';
import { GLASS } from '@/theme/glass';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile, useLeaderboardInfinite } from '@/features/products/useProfile';

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
} as const;

export default function LeaderboardScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: profile } = useProfile(!!token);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLeaderboardInfinite();

  const rows = data?.pages.flatMap((p) => p ?? []) ?? [];
  const meId = profile?.user_id;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/hub'));
  const goUser = (id: number) => router.push(`/user/${id}` as never);

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Leaderboard" onBack={goBack} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <AppText variant="body" className="text-white/70 text-center">No leaderboard data yet.</AppText>
        </View>
      ) : (
        <FlatList
          data={rows.slice(3)}
          keyExtractor={(e) => String(e.user_id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          ListHeaderComponent={<View className="pb-2"><Podium top3={rows.slice(0, 3)} onUser={goUser} /></View>}
          renderItem={({ item }) => (
            <View className="rounded-2xl overflow-hidden" style={glassCard}>
              <LeaderRow entry={item} you={meId != null && item.user_id === meId} onPress={() => goUser(item.user_id)} />
            </View>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#ffffff" className="py-4" /> : null}
        />
      )}
    </View>
  );
}

import { ActivityIndicator, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { useUserProfile, useUserPicks, useUserReviews } from '@/features/products/useProfile';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);

  const { data: profile, isLoading, isError } = useUserProfile(userId);
  const { data: picksData, isLoading: picksLoading } = useUserPicks(userId);
  const { data: reviewsData, isLoading: reviewsLoading } = useUserReviews(userId);

  const picks = picksData?.picks?.slice(0, 5) ?? [];
  const reviews = reviewsData?.reviews?.slice(0, 5) ?? [];
  const name = profile?.nickname ?? null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const goProduct = (pid: number) => router.push(`/product/${pid}` as never);

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title={name ?? 'Profile'} onBack={goBack} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : isError || !profile ? (
        <View className="flex-1 items-center justify-center px-8">
          <AppText variant="body" className="text-white/70 text-center">
            Couldn't load this profile.
          </AppText>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-10 gap-5"
          showsVerticalScrollIndicator={false}
        >
          <ProfileBody
            profile={profile}
            name={name}
            picks={picks}
            picksLoading={picksLoading}
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            picksTitle="Picked Products"
            reviewsTitle="Reviews"
            onProduct={goProduct}
          />
        </ScrollView>
      )}
    </View>
  );
}

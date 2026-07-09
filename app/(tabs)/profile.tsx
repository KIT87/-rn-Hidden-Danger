import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppModal, AppScreen, AppText } from '@/components/ui';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { GLASS } from '@/theme/glass';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile, useProfilePicks, useProfileReviews } from '@/features/products/useProfile';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, token, nickname } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const enabled = !!token;
  const { data: profile } = useProfile(enabled);
  const { data: picksData, isLoading: picksLoading } = useProfilePicks(enabled);
  const { data: reviewsData, isLoading: reviewsLoading } = useProfileReviews(enabled);

  const picks = picksData?.picks?.slice(0, 3) ?? [];
  const reviews = reviewsData?.reviews?.slice(0, 3) ?? [];
  const name = nickname ?? profile?.nickname ?? null;

  const { mutate: logout, isPending: signingOut } = useMutation({ mutationFn: () => authApi.logout() });
  function handleSignOut() {
    logout(undefined, {
      onSettled: async () => {
        await signOut();
        router.replace('/(auth)/login');
      },
    });
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const goProduct = (id: number) => router.push(`/product/${id}` as never);
  const goHubTab = (tab: 'picks' | 'reviews') =>
    router.push({ pathname: '/(tabs)/hub', params: { tab } } as never);

  return (
    <View className="flex-1">
      <AppScreen gradient scroll className="gap-5 pb-10">
        <StatusBar style="light" />

        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={goBack}
            hitSlop={10}
            className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={10}
            className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="settings-outline" size={18} color="#ffffff" />
          </Pressable>
        </View>

        <ProfileBody
          profile={profile}
          name={name}
          showDot
          picks={picks}
          picksLoading={picksLoading}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          picksTitle="My Picked Products"
          reviewsTitle="My Reviews"
          onProduct={goProduct}
          onSeeAllPicks={() => goHubTab('picks')}
          onSeeAllReviews={() => goHubTab('reviews')}
        />
      </AppScreen>

      {/* Settings menu */}
      <AppModal visible={menuOpen} title="Settings" onClose={() => setMenuOpen(false)}>
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="flex-row items-center gap-3 py-1 active:opacity-70"
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#fca5a5" />
          ) : (
            <Ionicons name="log-out-outline" size={20} color="#fca5a5" />
          )}
          <AppText variant="label" className="font-semibold" style={{ color: '#fca5a5' }}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </AppText>
        </Pressable>
      </AppModal>
    </View>
  );
}

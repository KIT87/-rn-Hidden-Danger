import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';

export default function ProfileScreen() {
  const { signOut, nickname } = useAuth();
  const router = useRouter();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: () => authApi.logout(),
  });

  function handleSignOut() {
    logout(undefined, {
      onSettled: async () => {
        await signOut();
        router.replace('/(auth)/login');
      },
    });
  }

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Profile" onBack={router.canGoBack() ? () => router.back() : undefined} />

      <View className="flex-1 items-center justify-center gap-6 px-6">
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: GLASS.cardBorder }}>
          <Ionicons name="person-outline" size={36} color="#ffffff" />
        </View>
        {nickname ? <AppText variant="heading" className="text-white">{nickname}</AppText> : null}

        <Pressable
          onPress={handleSignOut}
          disabled={isPending}
          className="flex-row items-center justify-center gap-2 rounded-2xl px-6 py-3.5 active:opacity-70"
          style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              <AppText variant="label" className="text-white font-semibold">Sign out</AppText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

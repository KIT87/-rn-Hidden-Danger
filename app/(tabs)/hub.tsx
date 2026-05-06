import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppScreen, AppText } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';

const HUB_ITEMS = [
  {
    route: '/community/top-picks' as const,
    icon: 'crown' as const,
    iconLib: 'material' as const,
    color: '#d97706',
    bg: '#fffbeb',
    title: 'Top Picks',
    description: 'Your curated list of favourite products',
  },
  {
    route: '/community/product-review' as const,
    icon: 'star-outline' as const,
    iconLib: 'ionicons' as const,
    color: '#2563eb',
    bg: '#eff6ff',
    title: 'Product Reviews',
    description: 'Share your experience with products',
  },
  {
    route: '/community/leaderboard' as const,
    icon: 'trophy-outline' as const,
    iconLib: 'ionicons' as const,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'Leaderboard',
    description: "See who's leading the community",
  },
] as const;

export default function HubScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

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
    <AppScreen className="gap-6 pt-4">
      <View className="gap-1">
        <AppText variant="title">The Hub</AppText>
        <AppText variant="body" className="text-gray-500">Community & your activity</AppText>
      </View>

      <View className="gap-3">
        {HUB_ITEMS.map((item) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route)}
            className="flex-row items-center gap-4 bg-white rounded-2xl px-4 py-4 border border-gray-100 active:opacity-75"
          >
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center shrink-0"
              style={{ backgroundColor: item.bg }}
            >
              {item.iconLib === 'material' ? (
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              ) : (
                <Ionicons name={item.icon} size={22} color={item.color} />
              )}
            </View>

            <View className="flex-1 gap-0.5">
              <AppText variant="label">{item.title}</AppText>
              <AppText variant="caption" className="text-gray-400">{item.description}</AppText>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </Pressable>
        ))}
      </View>

      <View className="flex-1 items-center justify-end pb-4">
        <Pressable
          onPress={handleSignOut}
          disabled={isPending}
          className="flex-row items-center gap-1.5 px-4 py-2 active:opacity-50"
        >
          <Ionicons name="log-out-outline" size={15} color="#9ca3af" />
          <AppText variant="caption" className="text-gray-400">
            {isPending ? 'Signing out…' : 'Sign out'}
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}

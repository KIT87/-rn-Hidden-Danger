import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, AppText } from '@/components/ui';

export default function LeaderboardScreen() {
  const router = useRouter();

  return (
    <AppScreen className="gap-4">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <AppText variant="heading">Leaderboard</AppText>
      </View>

      <View className="flex-1 items-center justify-center gap-4">
        <View className="w-16 h-16 rounded-3xl bg-purple-50 items-center justify-center">
          <Ionicons name="trophy-outline" size={32} color="#7c3aed" />
        </View>
        <View className="items-center gap-1">
          <AppText variant="heading">Coming soon</AppText>
          <AppText variant="body" className="text-gray-400 text-center">
            Community leaderboard will appear here
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
}

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AppButton, AppScreen, AppText } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';

export default function ProfileScreen() {
  const { signOut } = useAuth();
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
    <AppScreen className="justify-center items-center gap-6">
      <AppText variant="heading">Profile</AppText>
      <AppButton
        label="Sign out"
        variant="secondary"
        loading={isPending}
        onPress={handleSignOut}
      />
    </AppScreen>
  );
}

import '../global.css';

import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { queryClient } from '@/lib/query/client';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';

// gluestack-ui v1 internally uses the deprecated RN SafeAreaView; our code uses react-native-safe-area-context
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

function AuthGuard() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inSetup = segments[0] === 'setup';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!token && inSetup) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider colorMode="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGuard />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </QueryClientProvider>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}

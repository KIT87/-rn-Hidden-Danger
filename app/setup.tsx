import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api';
import { nicknameSchema, type NicknameFormData } from '@/features/auth/schema';

export default function SetupScreen() {
  const router = useRouter();
  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (nickname: string) => authApi.completeProfile(nickname),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NicknameFormData>({
    resolver: zodResolver(nicknameSchema),
  });

  function onSubmit({ nickname }: NicknameFormData) {
    mutate(nickname, {
      onSuccess: () => router.replace('/(tabs)/scan'),
    });
  }

  return (
    <AppScreen className="justify-center gap-8">
      <View className="gap-2">
        <AppText variant="title">Welcome!</AppText>
        <AppText variant="body" className="text-gray-500">
          Choose a nickname to get started.
        </AppText>
      </View>

      <View className="gap-4">
        <Controller
          control={control}
          name="nickname"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Nickname"
              placeholder="cool-user"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              error={errors.nickname?.message}
            />
          )}
        />

        {isError && (
          <AppText variant="caption" className="text-red-500">
            {(error as Error)?.message?.includes('422')
              ? 'That nickname is already taken.'
              : 'Something went wrong. Please try again.'}
          </AppText>
        )}

        <AppButton
          label="Continue"
          onPress={handleSubmit(onSubmit)}
          loading={isPending}
        />
      </View>
    </AppScreen>
  );
}

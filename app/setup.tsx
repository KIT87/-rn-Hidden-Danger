import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import { nicknameSchema, type NicknameFormData } from '@/features/auth/schema';

export default function SetupScreen() {
  const router = useRouter();
  const { setNickname } = useAuth();
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
      onSuccess: async (data) => {
        if (!data) return;
        await setNickname(data.nickname);
        router.replace('/(tabs)/scan');
      },
    });
  }

  const submit = handleSubmit(onSubmit);

  return (
    <AppScreen scroll keyboardAware className="gap-10 pt-16">
      {/* Brand */}
      <View className="items-center gap-4">
        <View className="w-20 h-20 rounded-3xl bg-primary-600 items-center justify-center shadow-sm">
          <Ionicons name="shield-checkmark" size={40} color="white" />
        </View>
        <View className="items-center gap-1">
          <AppText variant="title" className="text-center">One last step</AppText>
          <AppText variant="body" className="text-gray-500 text-center">
            Choose a nickname to get started.
          </AppText>
        </View>
      </View>

      {/* Form */}
      <View className="gap-4">
        <Controller
          control={control}
          name="nickname"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppInput
              label="Nickname"
              placeholder="cool-user"
              autoCapitalize="none"
              returnKeyType="go"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              onSubmitEditing={submit}
              error={errors.nickname?.message}
            />
          )}
        />

        {isError && (
          <AppText variant="caption" className="text-red-500">
            {error instanceof ApiError && error.status === 422
              ? 'That nickname is already taken or invalid.'
              : 'Something went wrong. Please try again.'}
          </AppText>
        )}

        <AppButton
          label="Continue"
          onPress={submit}
          loading={isPending}
        />
      </View>
    </AppScreen>
  );
}

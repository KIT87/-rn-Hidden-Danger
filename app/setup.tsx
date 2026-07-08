import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { useMutation } from '@tanstack/react-query';
import { GLASS } from '@/theme/glass';
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
    <AppScreen gradient scroll keyboardAware className="gap-10 pt-16">
      <StatusBar style="light" />

      {/* Brand */}
      <View className="items-center gap-4">
        <View
          className="w-20 h-20 rounded-3xl items-center justify-center"
          style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
        >
          <Ionicons name="person-circle-outline" size={40} color="#ffffff" />
        </View>
        <View className="items-center gap-1">
          <AppText variant="title" className="text-center text-white">One last step</AppText>
          <AppText variant="body" className="text-white/60 text-center">
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
              tone="glass"
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
          <AppText variant="caption" style={{ color: '#fca5a5' }}>
            {error instanceof ApiError && error.status === 422
              ? 'That nickname is already taken or invalid.'
              : 'Something went wrong. Please try again.'}
          </AppText>
        )}

        <AppButton label="Continue" onPress={submit} loading={isPending} />
      </View>
    </AppScreen>
  );
}

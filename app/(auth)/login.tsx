import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { useRequestCode } from '@/features/auth/useRequestCode';
import { loginSchema, type LoginFormData } from '@/features/auth/schema';
import { getRequestCodeError } from '@/features/auth/authErrors';

export default function LoginScreen() {
  const router = useRouter();
  const { mutate, isPending, isError, error } = useRequestCode();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit({ email }: LoginFormData) {
    mutate(email, {
      onSuccess: () =>
        router.push({ pathname: '/(auth)/confirm', params: { email } }),
    });
  }

  return (
    <AppScreen className="justify-center gap-8">
      <View className="gap-2">
        <AppText variant="title">Hidden Danger</AppText>
        <AppText variant="body" className="text-gray-500">
          Know what's in your products.
        </AppText>
      </View>

      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppInput
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        {isError && (
          <AppText variant="caption" className="text-red-500">
            {getRequestCodeError(error)}
          </AppText>
        )}

        <AppButton
          label="Send code"
          onPress={handleSubmit(onSubmit)}
          loading={isPending}
        />
      </View>
    </AppScreen>
  );
}

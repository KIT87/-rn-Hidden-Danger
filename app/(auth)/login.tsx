import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const submit = handleSubmit(onSubmit);

  return (
    <AppScreen scroll keyboardAware className="gap-10 pt-16">
      {/* Brand */}
      <View className="items-center gap-4">
        <View className="w-20 h-20 rounded-3xl bg-primary-600 items-center justify-center shadow-sm">
          <Ionicons name="shield-checkmark" size={40} color="white" />
        </View>
        <View className="items-center gap-1">
          <AppText variant="title" className="text-center">Hidden Danger</AppText>
          <AppText variant="body" className="text-gray-500 text-center">
            Know what's in your products.
          </AppText>
        </View>
      </View>

      {/* Form */}
      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="go"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              onSubmitEditing={submit}
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
          onPress={submit}
          loading={isPending}
        />
      </View>
    </AppScreen>
  );
}

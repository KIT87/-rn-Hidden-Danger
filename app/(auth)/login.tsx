import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { useRequestCode } from '@/features/auth/useRequestCode';
import { loginSchema, type LoginFormData } from '@/features/auth/schema';
import { getRequestCodeError } from '@/features/auth/authErrors';

// Intro-style brand lockup: frosted eye badge + "hidden danger" two-tone wordmark.
function Brand() {
  return (
    <View className="items-center gap-4">
      <View
        className="w-20 h-20 rounded-3xl items-center justify-center"
        style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
      >
        <Ionicons name="eye" size={38} color="#ffffff" />
      </View>
      <View className="items-center">
        <Text style={{ fontSize: 11, letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
          KNOW WHAT'S IN YOUR PRODUCTS
        </Text>
        <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: '900', color: '#ffffff', marginTop: 8 }}>hidden</Text>
        <Text style={{ fontSize: 34, lineHeight: 36, fontWeight: '900', color: 'rgba(255,255,255,0.35)' }}>danger</Text>
      </View>
    </View>
  );
}

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
    <AppScreen gradient scroll keyboardAware className="gap-12 pt-16">
      <StatusBar style="light" />
      <Brand />

      {/* Form */}
      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppInput
              tone="glass"
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
          <AppText variant="caption" style={{ color: '#fca5a5' }}>
            {getRequestCodeError(error)}
          </AppText>
        )}

        <AppButton label="Send code" onPress={submit} loading={isPending} />
      </View>
    </AppScreen>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppButton, AppInput, AppScreen, AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useVerifyCode } from '@/features/auth/useVerifyCode';
import { useRequestCode } from '@/features/auth/useRequestCode';
import { verifyCodeSchema, type VerifyCodeFormData } from '@/features/auth/schema';
import { getRequestCodeError } from '@/features/auth/authErrors';
import { ApiError } from '@/api/client';

export default function ConfirmScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { signIn } = useAuth();
  const { mutate: verify, isPending, isError, error } = useVerifyCode();
  const { mutate: resend, isPending: isResending, isError: isResendError, error: resendError } = useRequestCode();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
  });

  function onSubmit({ code }: VerifyCodeFormData) {
    verify(
      { email, code },
      {
        onSuccess: async (data) => {
          if (!data) return;
          await signIn(data.token, data.expires_at, data.nickname);
          if (!data.nickname) {
            router.replace('/setup');
          } else {
            router.replace('/(tabs)/scan');
          }
        },
      },
    );
  }

  const submit = handleSubmit(onSubmit);

  return (
    <AppScreen gradient scroll keyboardAware className="gap-10 pt-16">
      <StatusBar style="light" />

      {/* Header */}
      <View className="gap-2">
        <AppText variant="title" className="text-white">Check your email</AppText>
        <AppText variant="body" className="text-white/60">
          We sent a 4-digit code to{' '}
          <AppText variant="body" className="font-semibold text-white">
            {email}
          </AppText>
        </AppText>
      </View>

      {/* Form */}
      <View className="gap-4">
        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <AppInput
              tone="glass"
              label="Code"
              placeholder="1234"
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={4}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                if (text.length === 4) submit();
              }}
              onSubmitEditing={submit}
              error={errors.code?.message}
            />
          )}
        />

        {isError && (
          <AppText variant="caption" style={{ color: '#fca5a5' }}>
            {error instanceof ApiError && error.status === 422
              ? 'That code is incorrect or has expired. Try again or request a new one.'
              : 'Something went wrong. Please try again.'}
          </AppText>
        )}

        {isResendError && (
          <AppText variant="caption" style={{ color: '#fca5a5' }}>
            {getRequestCodeError(resendError)}
          </AppText>
        )}

        <AppButton label="Verify code" onPress={submit} loading={isPending} />

        <View className="flex-row items-center justify-center gap-6 pt-1">
          <Pressable onPress={() => resend(email)} disabled={isResending} hitSlop={8} className="flex-row items-center gap-1.5 active:opacity-60">
            {isResending && <ActivityIndicator size="small" color="#ffffff" />}
            <AppText variant="label" className="text-white/80 font-semibold">Resend code</AppText>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
            <AppText variant="label" className="text-white/60 font-semibold">Back</AppText>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
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
    <AppScreen scroll keyboardAware className="gap-10 pt-16">
      {/* Header */}
      <View className="gap-2">
        <AppText variant="title">Check your email</AppText>
        <AppText variant="body" className="text-gray-500">
          We sent a 4-digit code to{' '}
          <AppText variant="body" className="font-semibold text-gray-800">
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
          <AppText variant="caption" className="text-red-500">
            {error instanceof ApiError && error.status === 422
              ? 'That code is incorrect or has expired. Try again or request a new one.'
              : 'Something went wrong. Please try again.'}
          </AppText>
        )}

        {isResendError && (
          <AppText variant="caption" className="text-red-500">
            {getRequestCodeError(resendError)}
          </AppText>
        )}

        <AppButton
          label="Verify code"
          onPress={submit}
          loading={isPending}
        />

        <AppButton
          label="Resend code"
          variant="ghost"
          loading={isResending}
          onPress={() => resend(email)}
        />

        <AppButton
          label="Back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </AppScreen>
  );
}

import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';

export function useVerifyCode() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyCode(email, code),
  });
}

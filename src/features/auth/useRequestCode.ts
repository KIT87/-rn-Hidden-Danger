import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';

export function useRequestCode() {
  return useMutation({
    mutationFn: (email: string) => authApi.requestCode(email),
  });
}

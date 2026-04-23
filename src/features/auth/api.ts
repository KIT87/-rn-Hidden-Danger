import { api } from '@/api/client';

export interface VerifyCodeResponse {
  token: string;
  expires_at: string;
  is_new_user: boolean;
}

export interface CompleteProfileResponse {
  user_id: number;
  email: string;
  nickname: string;
}

export const authApi = {
  requestCode: (email: string) =>
    api.post('auth/request_code', { email }, false),

  verifyCode: (email: string, code: string) =>
    api.post<VerifyCodeResponse>('auth/verify_code', { email, code }, false),

  completeProfile: (nickname: string) =>
    api.post<CompleteProfileResponse>('auth/complete_profile', { nickname }),

  logout: () =>
    api.delete('auth/logout'),
};

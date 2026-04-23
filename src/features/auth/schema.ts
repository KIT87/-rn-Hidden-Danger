import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const verifyCodeSchema = z.object({
  code: z.string().length(4, 'Enter the 4-digit code'),
});

export const nicknameSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
export type NicknameFormData = z.infer<typeof nicknameSchema>;

import { ApiError } from '@/api/client';

export function getRequestCodeError(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 429) {
    const seconds = error.body.retry_after_seconds;
    return typeof seconds === 'number'
      ? `Please wait ${seconds}s before requesting a new code.`
      : 'Please wait a moment before requesting a new code.';
  }
  return 'Something went wrong. Please try again.';
}

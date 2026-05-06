import { useMutation } from '@tanstack/react-query';
import { productsApi } from './api';
import type { ReportReason } from './types';

export function useReportReview({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: number; reason: ReportReason }) =>
      productsApi.reportReview(reviewId, reason),
    onSuccess,
    onError: () => onError('Something went wrong. Please try again.'),
  });
}

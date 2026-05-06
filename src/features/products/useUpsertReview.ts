import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './api';
import type { ProductDetail } from './types';
import { productReviewsKey } from './useProductReviews';
import { MY_REVIEWS_QUERY_KEY } from './useMyReviews';

export function useUpsertReview(productId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof productsApi.upsertReview>[1]) =>
      productsApi.upsertReview(productId, payload),
    onSuccess: () => {
      queryClient.setQueryData<ProductDetail>(['products', productId], (old) => {
        if (!old) return old;
        return { ...old, user_reviewed: true };
      });
      queryClient.invalidateQueries({ queryKey: productReviewsKey(productId) });
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products', productId] });
    },
  });
}

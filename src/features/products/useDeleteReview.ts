import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './api';
import type { ProductDetail } from './types';
import { productReviewsKey } from './useProductReviews';
import { MY_REVIEWS_QUERY_KEY } from './useMyReviews';

export function useDeleteReview(productId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => productsApi.deleteReview(productId),
    onSuccess: () => {
      queryClient.setQueryData<ProductDetail>(['products', productId], (old) => {
        if (!old) return old;
        return { ...old, user_reviewed: false };
      });
      queryClient.invalidateQueries({ queryKey: productReviewsKey(productId) });
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products', productId] });
    },
  });
}

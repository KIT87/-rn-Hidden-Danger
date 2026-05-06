import { useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export const productReviewsKey = (productId: number) => ['productReviews', productId] as const;

export function useProductReviews(productId: number) {
  return useInfiniteQuery({
    queryKey: productReviewsKey(productId),
    queryFn: ({ pageParam }) => productsApi.productReviews(productId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      if (!last) return undefined;
      return last.page < last.total_pages ? last.page + 1 : undefined;
    },
  });
}

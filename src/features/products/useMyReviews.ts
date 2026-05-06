import { useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export const MY_REVIEWS_QUERY_KEY = ['myReviews'] as const;

export function useMyReviews() {
  return useInfiniteQuery({
    queryKey: MY_REVIEWS_QUERY_KEY,
    queryFn: ({ pageParam }) => productsApi.myReviews(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      if (!last) return undefined;
      return last.page < last.total_pages ? last.page + 1 : undefined;
    },
  });
}

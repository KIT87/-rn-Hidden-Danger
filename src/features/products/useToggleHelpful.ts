import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './api';
import type { Review, ReviewsResponse } from './types';
import { productReviewsKey } from './useProductReviews';

function updateReviewInPages(
  data: { pages: (ReviewsResponse | null)[] } | undefined,
  reviewId: number,
  updater: (r: Review) => Review,
) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => {
      if (!page) return page;
      return {
        ...page,
        reviews: page.reviews.map((r) => (r.review_id === reviewId ? updater(r) : r)),
      };
    }),
  };
}

export function useToggleHelpful(productId: number) {
  const queryClient = useQueryClient();
  const queryKey = productReviewsKey(productId);

  return useMutation({
    mutationFn: ({ reviewId, marked }: { reviewId: number; marked: boolean }) =>
      marked ? productsApi.unmarkHelpful(reviewId) : productsApi.markHelpful(reviewId),

    onMutate: async ({ reviewId, marked }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(
        queryKey,
        (data: { pages: (ReviewsResponse | null)[] } | undefined) =>
          updateReviewInPages(data, reviewId, (r) => ({
            ...r,
            user_marked_helpful: !marked,
            helpful_count: marked ? r.helpful_count - 1 : r.helpful_count + 1,
          })),
      );
      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSuccess: (data, { reviewId }) => {
      if (!data) return;
      queryClient.setQueryData(
        queryKey,
        (old: { pages: (ReviewsResponse | null)[] } | undefined) =>
          updateReviewInPages(old, reviewId, (r) => ({
            ...r,
            user_marked_helpful: data.user_marked_helpful,
            helpful_count: data.helpful_count,
          })),
      );
    },
  });
}

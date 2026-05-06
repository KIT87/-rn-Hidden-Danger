import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './api';
import type { ProductDetail, TopPicksResponse } from './types';
import { TOP_PICKS_QUERY_KEY } from './useTopPicks';

export function useRemovePick({ onError }: { onError: (msg: string) => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) => productsApi.removePick(productId),

    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: TOP_PICKS_QUERY_KEY });
      const previous = queryClient.getQueryData<TopPicksResponse>(TOP_PICKS_QUERY_KEY);

      queryClient.setQueryData<TopPicksResponse>(TOP_PICKS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          total_used: old.total_used - 1,
          remaining: old.remaining + 1,
          picks: old.picks.filter((p) => p.product_id !== productId),
        };
      });

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TOP_PICKS_QUERY_KEY, context.previous);
      }
      onError('Something went wrong. Please try again.');
    },

    onSuccess: (data, productId) => {
      if (!data) return;
      queryClient.setQueryData<ProductDetail>(['products', productId], (old) => {
        if (!old) return old;
        return { ...old, user_picked: data.user_picked, picks_count: data.picks_count };
      });
    },
  });
}

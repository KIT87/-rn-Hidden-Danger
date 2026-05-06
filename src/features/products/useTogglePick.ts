import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { productsApi } from './api';
import type { ProductDetail } from './types';
import { TOP_PICKS_QUERY_KEY } from './useTopPicks';

export function useTogglePick(productId: number, { onError }: { onError: (msg: string) => void }) {
  const queryClient = useQueryClient();
  const queryKey = ['products', productId];

  return useMutation({
    mutationFn: (userPicked: boolean) =>
      userPicked ? productsApi.removePick(productId) : productsApi.addPick(productId),

    onMutate: async (userPicked: boolean) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProductDetail>(queryKey);

      queryClient.setQueryData<ProductDetail>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          user_picked: !userPicked,
          picks_count: userPicked ? old.picks_count - 1 : old.picks_count + 1,
        };
      });

      return { previous };
    },

    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      if (err instanceof ApiError && err.status === 422) {
        onError("You've reached your 25-pick limit. Remove a pick first.");
      } else {
        onError('Something went wrong. Please try again.');
      }
    },

    onSuccess: (data) => {
      if (!data) return;
      queryClient.setQueryData<ProductDetail>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, user_picked: data.user_picked, picks_count: data.picks_count };
      });
      queryClient.invalidateQueries({ queryKey: TOP_PICKS_QUERY_KEY });
    },
  });
}

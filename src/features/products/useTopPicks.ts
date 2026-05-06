import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export const TOP_PICKS_QUERY_KEY = ['picks'] as const;

export function useTopPicks() {
  return useQuery({
    queryKey: TOP_PICKS_QUERY_KEY,
    queryFn: productsApi.picks,
  });
}

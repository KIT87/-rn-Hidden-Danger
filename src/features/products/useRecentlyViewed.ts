import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export function useRecentlyViewed(enabled = true) {
  return useQuery({
    queryKey: ['products', 'recentlyViewed'],
    queryFn: () => productsApi.recentlyViewed(),
    staleTime: 1000 * 60,
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export function useTopRated(enabled = true) {
  return useQuery({
    queryKey: ['products', 'topRated'],
    queryFn: () => productsApi.topRated(),
    staleTime: 1000 * 60 * 5, // matches the endpoint's 5-minute cache
    enabled,
  });
}

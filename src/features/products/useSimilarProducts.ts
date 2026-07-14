import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

// Safer alternatives for the product screen. The endpoint caches results for an
// hour per product, so we match that with a long staleTime.
export function useSimilarProducts(id: number) {
  return useQuery({
    queryKey: ['products', id, 'similar'],
    queryFn: () => productsApi.similar(id),
    staleTime: 1000 * 60 * 60,
    enabled: !isNaN(id),
  });
}

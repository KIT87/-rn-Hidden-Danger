import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.detail(id),
    staleTime: 1000 * 60 * 5,
    enabled: !isNaN(id),
  });
}

import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export function useRandomProducts() {
  return useQuery({
    queryKey: ['products', 'random'],
    queryFn: () => productsApi.random(),
    staleTime: 1000 * 60 * 10,
  });
}

import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

export function useSearchHistory() {
  return useQuery({
    queryKey: ['search', 'history'],
    queryFn: () => productsApi.history(),
    staleTime: 1000 * 30,
  });
}

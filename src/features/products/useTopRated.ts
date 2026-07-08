import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

// Single-page fetch for the home "Top picked products" carousel.
export function useTopRated(enabled = true) {
  return useQuery({
    queryKey: ['products', 'topRated'],
    queryFn: () => productsApi.topRated(),
    staleTime: 1000 * 60 * 5, // matches the endpoint's 5-minute cache
    enabled,
  });
}

const PAGE_SIZE = 10;

// Paginated (offset-based, fixed limit) fetch for the full /top-rated screen.
export function useTopRatedPaged() {
  return useInfiniteQuery({
    queryKey: ['products', 'topRated', 'paged'],
    queryFn: ({ pageParam }) => productsApi.topRated(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage?.length ?? 0) === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    staleTime: 1000 * 60 * 5,
  });
}

import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

// Recent scans / text searches. Pass a `type` to fetch just that bucket
// (`scan` or `search`) so each list is fully populated; omit for a combined list.
export function useSearchHistory(type?: 'scan' | 'search', enabled = true) {
  return useQuery({
    queryKey: ['search', 'history', type ?? 'all'],
    queryFn: () => productsApi.history(type),
    staleTime: 1000 * 30,
    enabled,
  });
}

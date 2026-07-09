import { useQuery } from '@tanstack/react-query';
import { productsApi } from './api';
import type { HazardCategoryKey } from './types';

// Drill-down behind a category's `prof` flag on the product screen: contributing
// ingredients + the publications backing them (endpoint 5c). Only fetches while
// `category` is set (i.e. the publications modal is open).
export function useHazardCategory(productId: number, category: HazardCategoryKey | null) {
  return useQuery({
    queryKey: ['products', productId, 'hazard_category', category],
    queryFn: () => productsApi.hazardCategory(productId, category as HazardCategoryKey),
    staleTime: 1000 * 60 * 5,
    enabled: !isNaN(productId) && category != null,
  });
}

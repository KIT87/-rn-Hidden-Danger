import { api } from '@/api/client';
import type { ProductDetail, ProductSummary, SearchHistoryItem } from './types';

export const productsApi = {
  random: () => api.get<ProductSummary[]>('products/random'),
  detail: (id: number) => api.get<ProductDetail>(`products/${id}`),
  searchByName: (name: string) => api.post<ProductSummary[]>('search/name', { name }),
  searchByEan: (ean: string) => api.post<ProductSummary[]>('search/ean', { ean }),
  history: () => api.get<SearchHistoryItem[]>('search/history'),
};

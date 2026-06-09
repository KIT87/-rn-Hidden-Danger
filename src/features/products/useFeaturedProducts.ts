import { useState } from 'react';
import { productsApi } from './api';
import type { ProductSummary } from './types';

const PAGE_SIZE = 3;
const MAX = 100;

export function useFeaturedProducts() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  async function load(offset: number) {
    if (offset === 0) setInitialLoading(true);
    else setLoading(true);
    try {
      const results = await productsApi.featured(PAGE_SIZE, offset);
      const batch = results ?? [];
      setProducts((prev) => {
        const next = offset === 0 ? batch : [...prev, ...batch];
        const seen = new Set<number>();
        return next.filter((p) => {
          if (seen.has(p.product_id)) return false;
          seen.add(p.product_id);
          return true;
        });
      });
      const nextTotal = offset + batch.length;
      setHasMore(batch.length === PAGE_SIZE && nextTotal < MAX);
    } catch (err) {
      console.error('[useFeaturedProducts]', err);
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  async function loadMore(currentCount: number) {
    await load(currentCount);
  }

  async function reload() {
    setProducts([]);
    setHasMore(true);
    await load(0);
  }

  return { products, initialLoading, loading, hasMore, reload, loadMore };
}

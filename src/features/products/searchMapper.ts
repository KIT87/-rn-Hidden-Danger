import type { CatalogSearchProduct, ProductSummary } from './types';

// `risk_score` is the risk level 1–3 (1 low · 2 moderate · 3 high; null = unknown).
// The search endpoint delivers it under the legacy field name `max_hazard_score`.
export function catalogToSummary(p: CatalogSearchProduct): ProductSummary {
  return {
    product_id: p.product_id,
    name: p.canonical_name,
    brand_name: p.canonical_brand ?? '',
    risk_score: p.max_hazard_score,
    volume: null,
    volume_units: null,
    image_url: p.image_url,
    images: p.image_url ? [p.image_url] : [],
    has_high_hazard: p.has_high_hazard,
    hazard_ingredients: 0, // not returned by the catalog search endpoint
    picks_count: 0,
    reviews_count: 0,
    average_score: null,
  };
}

// GTINs come back zero-padded to varying widths (e.g. "00884486407207") while a
// scanned/typed code may omit leading zeros. Compare after stripping them.
function normalizeGtin(code: string): string {
  return code.replace(/\D/g, '').replace(/^0+/, '') || '0';
}

export function findExactGtinMatch(
  products: CatalogSearchProduct[],
  code: string,
): CatalogSearchProduct | undefined {
  const target = normalizeGtin(code);
  return products.find((p) => p.gtins?.some((g) => normalizeGtin(g) === target));
}

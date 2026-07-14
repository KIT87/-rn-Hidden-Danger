export type ConcernLevel = 'LOW' | 'MODERATE' | 'HIGH' | null;

// Product-level concerns are not provided by the API right now — commented out
// until they're reinstated. See also ProductSummary.concerns / ProductDetail.concerns.
// export interface Concerns {
//   cancer: ConcernLevel;
//   dev_rep: ConcernLevel;
//   allergy: ConcernLevel;
//   use_res_level: ConcernLevel;
// }

// export interface DetailedConcerns extends Concerns {
//   other_low: string[];
//   other_moderate: string[];
//   other_high: string[];
// }

export type HazardLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';

// Catalog hazard severity: 1 (low) · 2 (moderate) · 3 (high). `null` = no warnings.
export type HazardSeverity = 1 | 2 | 3;

// Shared "Product summary shape" returned by every product list endpoint
// (random, featured, best_reviewed, recently_viewed, picks) and embedded in
// ProductDetail. `images` is a plain list of URLs; `image_url` is the primary.
export interface ProductSummary {
  product_id: number;
  name: string;
  brand_name: string;
  // Risk level: 1 = low, 2 = moderate, 3 = high (higher = more risk); null = unknown.
  risk_score: HazardSeverity | null;
  volume: number | null;
  volume_units: string | null;
  image_url: string | null;
  images: string[];
  has_high_hazard: boolean;
  hazard_ingredients: number;
  picks_count: number;
  reviews_count: number;
  average_score: number | null;
}

export interface PickResponse {
  picks_count: number;
  user_picked: boolean;
}

// ─── Top rated (GET products/top_rated) ────────────────────────────────────────
// Lighter, review-oriented shape (not the full ProductSummary): no images[]/hazard
// fields; adds average_score, reviews_count and a top review highlight.

export interface ReviewHighlight {
  excerpt: string;
  overall_score: number;
  helpful_count: number;
  user_nickname: string;
  created_at: string;
}

export interface TopRatedProduct {
  product_id: number;
  name: string;
  brand_name: string;
  image_url: string | null;
  risk_score: HazardSeverity | null; // risk level 1–3, null = unknown
  average_score: number | null;
  reviews_count: number;
  review_highlight: ReviewHighlight | null;
}

// ─── Similar products (GET products/:id/similar) ───────────────────────────────
// Minimal shape: safer alternatives to a given product. No brand/hazard fields.
export interface SimilarProduct {
  product_id: number;
  name: string;
  image_url: string | null;
  risk_score: HazardSeverity | null; // risk level 1–3, null = unknown
}

// ─── Catalog search (EXPO_PUBLIC_SEARCH_API_URL) ───────────────────────────────

export interface CatalogSearchRequest {
  name?: string;
  ingredients?: string[];
  ean?: string;
  ingredients_match?: 'all' | 'exact' | 'any';
  limit?: number;
  offset?: number;
  include_images?: boolean;
}

export interface CatalogSearchProduct {
  product_id: number;
  canonical_name: string;
  canonical_brand: string | null;
  primary_source: number;
  n_variants: number;
  n_sources: number;
  gtins: string[] | null;
  has_high_hazard: boolean;
  // Search endpoint keeps the field NAME `max_hazard_score` but its values are now
  // the catalog severity 1–3 (or null), aliased from `max_severity` server-side.
  max_hazard_score: HazardSeverity | null;
  image_url: string | null;
  matched_on: string[];
}

export interface CatalogSearchResponse {
  count: number;
  truncated: boolean;
  products: CatalogSearchProduct[];
}

export interface TopPicksResponse {
  total_used: number;
  limit: number;
  remaining: number;
  picks: ProductSummary[];
}

export interface Ingredient {
  ingredient_id: number;
  name: string;
  position: number;
  // Unified hazard level aggregated across warning sources (provenance not exposed).
  hazard_level: HazardLevel;
}

// Per-category hazard breakdown (product detail only). `severity` is the
// product-level max per category (1–3, or null when no known concern). `prof`
// (publication-backed) is true when at least one displayed ingredient has a
// current warning in that category backed by publications — drill down via
// productsApi.hazardCategory (endpoint 5c).
export interface HazardCategory {
  severity: HazardSeverity | null;
  prof: boolean;
}

export type HazardCategoryKey =
  | 'allergy'
  | 'irritation'
  | 'cancer'
  | 'endocrine'
  | 'environmental'
  | 'other';

export type HazardCategories = Record<HazardCategoryKey, HazardCategory>;

// ─── Publications (endpoint 5b / 5c) ────────────────────────────────────────
export interface Publication {
  url: string | null;
  year: string | null;
  label: string | null;
  authority: string | null;
}

export interface HazardCategoryIngredient {
  ingredient_id: number;
  name: string;
  severity: HazardSeverity | null;
  publications: Publication[];
}

// GET products/:product_id/hazard_categories/:hazard_category (5c)
export interface HazardCategoryDetail {
  product_id: number;
  hazard_category: HazardCategoryKey;
  severity: HazardSeverity | null;
  prof: boolean;
  ingredients: HazardCategoryIngredient[];
}

export interface ProductDetail extends ProductSummary {
  user_picked: boolean;
  user_reviewed: boolean;
  featured: boolean;
  hazard_categories: HazardCategories | null;
  label_ingredients: string | null;
  avg_performance_score: number | null;
  avg_ease_of_use_score: number | null;
  avg_accuracy_of_claims_score: number | null;
  avg_value_for_money_score: number | null;
  avg_packaging_score: number | null;
  ingredients: Ingredient[];
}

// Static overview/marketing numbers (GET stats). Values are backend constants.
export interface AppStats {
  products: number;
  brands: number;
  scans_performed: number;
  cancer_risk_products: number;
  allergy_risk_products: number;
  irritation_risk_products: number;
  endocrine_risk_products: number;
  other_risk_products: number;
}

// GET profile — the signed-in user's gamification profile (points, rank, streaks,
// activity tallies). See also the mocked Leaderboard tab in the Hub.
export interface UserProfile {
  user_id: number;
  nickname: string;
  points_total: number;
  rank: number;
  current_streak: number;
  longest_streak: number;
  total_reviews: number;
  total_picks: number;
  total_scans: number;
  total_searches: number;
}

// GET profile/picks — the caller's picked products, offset-paginated (10/page).
// Prose in the API doc: "full product summary (same shape as search results)".
export interface ProfilePicksResponse {
  offset: number;
  limit: number;
  total_count: number;
  picks: ProductSummary[];
}

// GET profile/reviews — a lighter review summary than the full Review (no score
// breakdown, images, buy_again, or lock/hidden flags), offset-paginated (10/page).
export interface ProfileReviewSummary {
  review_id: number;
  product_id: number;
  product_name: string;
  overall_score: number;
  review_text: string;
  helpful_count: number;
  created_at: string;
}

export interface ProfileReviewsResponse {
  offset: number;
  limit: number;
  total_count: number;
  reviews: ProfileReviewSummary[];
}

// POST activities — client-driven gamification events. `scan`/`search` each award
// a point; `app_open` advances the daily streak (same-day repeat is a server no-op).
export type ActivityType = 'scan' | 'search' | 'app_open';

// Recorded via POST activities. `query` (+ resolved product, for scans) is
// optional — when present the server also saves it to search/scan history.
export interface ActivityPayload {
  type: ActivityType;
  query?: string;
  product_found?: boolean | null;
  product_name?: string | null;
  product_image_url?: string | null;
}

export interface ActivityResponse {
  points_total: number;
  current_streak: number;
  longest_streak: number;
}

// GET leaderboard — top players ranked by points_total desc. Rows carry user_id
// so entries can deep-link to the corresponding user profile.
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  nickname: string;
  points_total: number;
}

// GET leaderboard/me — a window of rows around the caller (a few above, more
// below), each flagged with whether it's the caller's own row.
export interface LeaderboardMeRow extends LeaderboardEntry {
  is_me: boolean;
}

// GET search/history — recent scans & text searches (client-populated via
// POST activities). `type` is `scan` (barcode/EAN lookup) or `search` (text).
// `product_*` are populated for resolved scans, null for text searches.
export interface SearchHistoryItem {
  type: 'scan' | 'search';
  query: string;
  product_found: boolean | null;
  product_name: string | null;
  product_image_url: string | null;
  searched_at: string;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export type BuyAgain = 'yes' | 'no' | 'not_sure';
export type UsageAmount = 'first_package' | 'finished_one' | 'finished_multiple' | 'sample_one' | 'multiple_samples';
export type UsageDuration = 'sample_one' | 'one_week' | 'two_weeks' | 'one_month' | 'several_months' | 'one_year_plus';
export type PurchaseSource = 'brand_testing' | 'online_store' | 'physical_store' | 'pharmacy' | 'marketplace' | 'perfume_store' | 'supermarket' | 'gift';
export type ReportReason = 'spam' | 'offensive' | 'fake_review';

export interface Review {
  review_id: number;
  product_id: number;
  user_id: number;
  user_nickname: string;
  overall_score: number;
  performance_score: number;
  ease_of_use_score: number;
  accuracy_of_claims_score: number;
  value_for_money_score: number;
  packaging_score: number;
  review_text: string;
  advantages: string;
  disadvantages: string;
  buy_again: BuyAgain;
  usage_amount: UsageAmount;
  usage_duration: UsageDuration;
  purchase_source: PurchaseSource;
  image_url: string | null;
  helpful_count: number;
  user_marked_helpful: boolean;
  user_is_owner: boolean;
  locked: boolean;
  hidden: boolean;
  created_at: string;
}

export interface MyReview extends Review {
  product_name: string;
  product_images: string[];
}

export interface ReviewsResponse {
  product_id: number;
  product_name: string;
  images: string[];
  page: number;
  total_pages: number;
  total_count: number;
  // Counts of visible reviews answering buy_again yes/no across ALL pages
  // (not_sure/unset excluded).
  buy_again_yes: number;
  buy_again_no: number;
  reviews: Review[];
}

export interface MyReviewsResponse {
  page: number;
  total_pages: number;
  total_count: number;
  reviews: MyReview[];
}

export interface HelpfulResponse {
  helpful_count: number;
  user_marked_helpful: boolean;
}

export interface ImageUploadUrlResponse {
  upload_url: string;
  file_path: string;
  public_url: string;
  content_type: string;
}

export interface UpsertReviewPayload {
  overall_score: number;
  performance_score: number;
  ease_of_use_score: number;
  accuracy_of_claims_score: number;
  value_for_money_score: number;
  packaging_score: number;
  review_text: string;
  advantages: string;
  disadvantages: string;
  buy_again: BuyAgain;
  usage_amount: UsageAmount;
  usage_duration: UsageDuration;
  purchase_source: PurchaseSource;
  image_url: string | null;
}

// ─── Product corrections (report wrong data) ───────────────────────────────
export type CorrectionType = 'brand' | 'product_name' | 'ingredients';

export interface CreateReportResponse {
  report_id: number;
}

// POST corrections/image_upload — server-side multipart upload to GCS.
// The old GET corrections/image_upload_url (signed-URL) flow is gone; the client
// now POSTs the raw file and gets the hosted URL back.
export interface CorrectionImageUploadResponse {
  public_url: string;
  file_path: string;
  content_type: string;
}

export interface CorrectionPoints {
  points_awarded: number;
  points_pending: number;
}

export interface IngredientsCorrectionPayload {
  label_image_urls: string[];
  product_image_url?: string;
  barcode?: string;
}

export interface BonusCorrectionPayload {
  product_image_url?: string;
  barcode?: string;
  label_image_urls: string[];
}

export interface CorrectionSubmitResponse {
  points_awarded_total: number;
  points_pending_total: number;
  points_total: number;
}

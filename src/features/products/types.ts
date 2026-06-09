export type ConcernLevel = 'LOW' | 'MODERATE' | 'HIGH' | null;

export interface Concerns {
  cancer: ConcernLevel;
  dev_rep: ConcernLevel;
  allergy: ConcernLevel;
  use_res_level: ConcernLevel;
}

export interface DetailedConcerns extends Concerns {
  other_low: string[];
  other_moderate: string[];
  other_high: string[];
}

export interface ProductImage {
  url: string;
  source: 'a' | 'b' | 'c';
  type: 'main' | 'mobile';
}

export interface ProductSummary {
  product_id: number;
  name: string;
  brand_name: string;
  score: number;
  volume: number | null;
  volume_units: string | null;
  images: ProductImage[];
  picks_count: number;
  reviews_count: number;
  average_score: number | null;
  concerns: Concerns;
}

export interface PickResponse {
  picks_count: number;
  user_picked: boolean;
}

export interface EanSearchResult {
  match_type: 'exact' | 'prefix';
  results: ProductSummary[];
  total: number;
  page: number;
}

export interface TopPicksResponse {
  total_used: number;
  limit: number;
  remaining: number;
  picks: ProductSummary[];
}

export interface IngredientConcern {
  source: 'a' | 'b' | 'c';
  concern_name: string;
  level: string;
  description: string | null;
}

export interface Ingredient {
  ingredient_id: number;
  name: string;
  position: number;
  active_ingredient: boolean;
  trace_ingredient: boolean;
  hazard_rating_display: string | null;
  concerns: IngredientConcern[];
}

export interface Certifier {
  certifier_id: number;
  name: string;
  description: string;
  image_url: string;
  jurisdiction: string | null;
  oca_rating: string | null;
  bonus_points: number | null;
  oca_comments: string | null;
}

export interface ProductDetail extends Omit<ProductSummary, 'concerns'> {
  picks_count: number;
  user_picked: boolean;
  product_type: string;
  description: string | null;
  internal_comments: string | null;
  source_name: string;
  label_ingredients: string | null;
  avg_performance_score: number | null;
  avg_ease_of_use_score: number | null;
  avg_accuracy_of_claims_score: number | null;
  avg_value_for_money_score: number | null;
  avg_packaging_score: number | null;
  user_reviewed: boolean;
  categories: string[];
  concerns: DetailedConcerns;
  certifiers: Certifier[];
  ingredients: Ingredient[];
}

export interface SearchHistoryItem {
  query_type: 'ean' | 'name';
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
  product_images: ProductImage[];
}

export interface ReviewsResponse {
  product_id: number;
  product_name: string;
  images: ProductImage[];
  page: number;
  total_pages: number;
  total_count: number;
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

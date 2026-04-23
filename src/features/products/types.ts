export type ConcernLevel = 'LOW' | 'MODERATE' | 'HIGH';

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

export interface ProductSummary {
  product_id: number;
  name: string;
  brand_name: string;
  company_name: string;
  score: number;
  image_url: string | null;
  concerns: Concerns;
}

export interface IngredientConcern {
  concern_name: string;
  level: 'low' | 'moderate' | 'high' | null;
}

export interface Ingredient {
  ingred_id: number;
  name: string;
  orig_text: string;
  score: number;
  sort_order: number;
  concerns: IngredientConcern[];
}

export interface Certification {
  cert_id: number;
  name: string;
  logo_url: string;
  website: string;
  description: string;
}

export interface PreferenceFlag {
  name: string;
  source: string;
  list_name: string;
}

export interface Retailer {
  name: string;
  url: string;
  type: string;
}

export interface ProductDetail extends Omit<ProductSummary, 'concerns'> {
  product_type: string;
  ewg_verified: boolean;
  minority_owned: boolean;
  old_product: boolean;
  mobile_image_url: string | null;
  web_url: string;
  asin: string | null;
  last_updated: string;
  label_ingredients: string | null;
  label_warnings: string | null;
  label_directions: string | null;
  categories: string[];
  concerns: DetailedConcerns;
  certifications: Certification[];
  ingredients: Ingredient[];
  preference_flags: {
    avoid: PreferenceFlag[];
    prefer: PreferenceFlag[];
  };
  retailers: Retailer[];
}

export interface SearchHistoryItem {
  query_type: 'ean' | 'name';
  query: string;
  product_name: string | null;
  product_image_url: string | null;
  searched_at: string;
}

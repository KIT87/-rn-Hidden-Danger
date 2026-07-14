import { api, searchApi } from '@/api/client';
import type {
  ActivityPayload,
  ActivityResponse,
  AppStats,
  CatalogSearchRequest,
  CatalogSearchResponse,
  HazardCategoryDetail,
  HazardCategoryKey,
  HelpfulResponse,
  ImageUploadUrlResponse,
  LeaderboardEntry,
  LeaderboardMeRow,
  MyReviewsResponse,
  PickResponse,
  ProductDetail,
  ProductSummary,
  ProfilePicksResponse,
  ProfileReviewsResponse,
  ReportReason,
  Review,
  ReviewsResponse,
  SearchHistoryItem,
  SimilarProduct,
  TopPicksResponse,
  TopRatedProduct,
  UpsertReviewPayload,
  UserProfile,
} from './types';

export const productsApi = {
  featured: (limit: number, offset: number) =>
    api.get<ProductSummary[]>(`products/featured?limit=${limit}&offset=${offset}`),
  recentlyViewed: () => api.get<ProductSummary[]>('products/recently_viewed'),
  topRated: (limit = 10, offset = 0) =>
    api.get<TopRatedProduct[]>(`products/top_rated?limit=${limit}&offset=${offset}`),
  detail: (id: number) => api.get<ProductDetail>(`products/${id}`),
  similar: (id: number) => api.get<SimilarProduct[]>(`products/${id}/similar`),
  hazardCategory: (productId: number, category: HazardCategoryKey) =>
    api.get<HazardCategoryDetail>(`products/${productId}/hazard_categories/${category}`),
  search: (body: CatalogSearchRequest) =>
    searchApi.search<CatalogSearchResponse>({ include_images: true, ...body }),
  history: (type?: 'scan' | 'search') =>
    api.get<SearchHistoryItem[]>(`search/history${type ? `?type=${type}` : ''}`),
  stats: () => api.get<AppStats>('stats'),
  profile: () => api.get<UserProfile>('profile'),
  profilePicks: (offset = 0) =>
    api.get<ProfilePicksResponse>(`profile/picks?offset=${offset}`),
  profileReviews: (offset = 0) =>
    api.get<ProfileReviewsResponse>(`profile/reviews?offset=${offset}`),
  userProfile: (id: number) => api.get<UserProfile>(`users/${id}/profile`),
  userPicks: (id: number, offset = 0) =>
    api.get<ProfilePicksResponse>(`users/${id}/picks?offset=${offset}`),
  userReviews: (id: number, offset = 0) =>
    api.get<ProfileReviewsResponse>(`users/${id}/reviews?offset=${offset}`),
  leaderboard: (offset = 0) =>
    api.get<LeaderboardEntry[]>(`leaderboard?offset=${offset}`),
  leaderboardMe: () => api.get<LeaderboardMeRow[]>('leaderboard/me'),
  recordActivity: (payload: ActivityPayload) =>
    api.post<ActivityResponse>('activities', payload),
  picks: () => api.get<TopPicksResponse>('picks'),
  addPick: (id: number) => api.post<PickResponse>(`products/${id}/pick`),
  removePick: (id: number) => api.delete<PickResponse>(`products/${id}/pick`),

  productReviews: (productId: number, page = 1) =>
    api.get<ReviewsResponse>(`products/${productId}/reviews?page=${page}`),
  myReviews: (page = 1) =>
    api.get<MyReviewsResponse>(`reviews?page=${page}`),
  upsertReview: (productId: number, payload: UpsertReviewPayload) =>
    api.post<Review>(`products/${productId}/review`, payload),
  deleteReview: (productId: number) =>
    api.delete<{ message: string }>(`products/${productId}/review`),
  markHelpful: (reviewId: number) =>
    api.post<HelpfulResponse>(`reviews/${reviewId}/helpful`),
  unmarkHelpful: (reviewId: number) =>
    api.delete<HelpfulResponse>(`reviews/${reviewId}/helpful`),
  reportReview: (reviewId: number, reason: ReportReason) =>
    api.post<{ message: string }>(`reviews/${reviewId}/report`, { reason }),
  imageUploadUrl: () =>
    api.get<ImageUploadUrlResponse>('reviews/image_upload_url'),
};

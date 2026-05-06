import { api } from '@/api/client';
import type {
  HelpfulResponse,
  ImageUploadUrlResponse,
  MyReviewsResponse,
  PickResponse,
  ProductDetail,
  ProductSummary,
  ReportReason,
  Review,
  ReviewsResponse,
  SearchHistoryItem,
  TopPicksResponse,
  UpsertReviewPayload,
} from './types';

export const productsApi = {
  featured: (limit: number, offset: number) =>
    api.get<ProductSummary[]>(`products/featured?limit=${limit}&offset=${offset}`),
  recentlyViewed: () => api.get<ProductSummary[]>('products/recently_viewed'),
  detail: (id: number) => api.get<ProductDetail>(`products/${id}`),
  searchByName: (name: string) => api.post<ProductSummary[]>('search/name', { name }),
  searchByEan: (ean: string) => api.post<ProductSummary[]>('search/ean', { ean }),
  history: () => api.get<SearchHistoryItem[]>('search/history'),
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

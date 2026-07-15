import { api } from '@/api/client';
import type {
  BarcodeSubmissionResponse,
  CorrectionPoints,
  CorrectionSubmitResponse,
  CreateSubmissionResponse,
  ImageUploadUrlResponse,
} from '@/features/products/types';

// "Submit new product" wizard — a sibling of corrections, stored in the same
// moderator-review area. Each step posts to its own endpoint and awards points;
// nothing hits the leaderboard until `submit` (finalize). See api/endpoints.md
// § "Product submissions".
export const submissionsApi = {
  create: () => api.post<CreateSubmissionResponse>('product_submissions'),
  submitBarcode: (submissionId: number, barcode: string) =>
    api.post<BarcodeSubmissionResponse>(`product_submissions/${submissionId}/barcode`, { barcode }),
  submitBrand: (submissionId: number, brand_name: string) =>
    api.post<CorrectionPoints>(`product_submissions/${submissionId}/brand`, { brand_name }),
  submitName: (submissionId: number, product_name: string) =>
    api.post<CorrectionPoints>(`product_submissions/${submissionId}/name`, { product_name }),
  submitIngredients: (submissionId: number, label_image_urls: string[]) =>
    api.post<CorrectionPoints>(`product_submissions/${submissionId}/ingredients`, { label_image_urls }),
  submitProductImage: (submissionId: number, product_image_url: string) =>
    api.post<CorrectionPoints>(`product_submissions/${submissionId}/product_image`, { product_image_url }),
  submit: (submissionId: number) =>
    api.post<CorrectionSubmitResponse>(`product_submissions/${submissionId}/submit`),
  imageUploadUrl: () =>
    api.get<ImageUploadUrlResponse>('product_submissions/image_upload_url'),
};

import { api } from '@/api/client';
import type {
  BonusCorrectionPayload,
  CorrectionPoints,
  CorrectionSubmitResponse,
  CorrectionType,
  CreateReportResponse,
  ImageUploadUrlResponse,
  IngredientsCorrectionPayload,
} from '@/features/products/types';

export const correctionsApi = {
  createReport: (productId: number, types: CorrectionType[]) =>
    api.post<CreateReportResponse>(`products/${productId}/corrections`, { types }),
  submitBrand: (reportId: number, suggested_brand: string) =>
    api.post<CorrectionPoints>(`corrections/${reportId}/brand`, { suggested_brand }),
  submitName: (reportId: number, suggested_name: string) =>
    api.post<CorrectionPoints>(`corrections/${reportId}/name`, { suggested_name }),
  submitIngredients: (reportId: number, payload: IngredientsCorrectionPayload) =>
    api.post<CorrectionPoints>(`corrections/${reportId}/ingredients`, payload),
  submitBonus: (reportId: number, payload: BonusCorrectionPayload) =>
    api.post<CorrectionPoints>(`corrections/${reportId}/bonus`, payload),
  submit: (reportId: number) =>
    api.post<CorrectionSubmitResponse>(`corrections/${reportId}/submit`),
  imageUploadUrl: () =>
    api.get<ImageUploadUrlResponse>('corrections/image_upload_url'),
};

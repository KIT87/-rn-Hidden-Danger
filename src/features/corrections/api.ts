import { api } from '@/api/client';
import type {
  BonusCorrectionPayload,
  CorrectionImageUploadResponse,
  CorrectionPoints,
  CorrectionSubmitResponse,
  CorrectionType,
  CreateReportResponse,
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
  uploadImage: (form: FormData) =>
    api.upload<CorrectionImageUploadResponse>('corrections/image_upload', form),
};

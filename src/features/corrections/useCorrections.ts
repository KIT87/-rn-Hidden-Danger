import { useMutation, useQueryClient } from '@tanstack/react-query';
import { correctionsApi } from './api';
import type {
  BonusCorrectionPayload,
  CorrectionType,
  IngredientsCorrectionPayload,
} from '@/features/products/types';

export function useCreateReport() {
  return useMutation({
    mutationFn: ({ productId, types }: { productId: number; types: CorrectionType[] }) =>
      correctionsApi.createReport(productId, types),
  });
}

export function useSubmitBrand() {
  return useMutation({
    mutationFn: ({ reportId, value }: { reportId: number; value: string }) =>
      correctionsApi.submitBrand(reportId, value),
  });
}

export function useSubmitName() {
  return useMutation({
    mutationFn: ({ reportId, value }: { reportId: number; value: string }) =>
      correctionsApi.submitName(reportId, value),
  });
}

export function useSubmitIngredients() {
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: number; payload: IngredientsCorrectionPayload }) =>
      correctionsApi.submitIngredients(reportId, payload),
  });
}

export function useSubmitBonus() {
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: number; payload: BonusCorrectionPayload }) =>
      correctionsApi.submitBonus(reportId, payload),
  });
}

// Finalize commits awarded points; refresh the profile/leaderboard caches so the
// new total shows up (same keys useActivity.ts invalidates).
export function useFinalizeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => correctionsApi.submit(reportId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

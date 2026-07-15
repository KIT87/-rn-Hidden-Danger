import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from './api';

export function useCreateSubmission() {
  return useMutation({ mutationFn: () => submissionsApi.create() });
}

export function useSubmitSubmissionBarcode() {
  return useMutation({
    mutationFn: ({ submissionId, barcode }: { submissionId: number; barcode: string }) =>
      submissionsApi.submitBarcode(submissionId, barcode),
  });
}

export function useSubmitSubmissionBrand() {
  return useMutation({
    mutationFn: ({ submissionId, value }: { submissionId: number; value: string }) =>
      submissionsApi.submitBrand(submissionId, value),
  });
}

export function useSubmitSubmissionName() {
  return useMutation({
    mutationFn: ({ submissionId, value }: { submissionId: number; value: string }) =>
      submissionsApi.submitName(submissionId, value),
  });
}

export function useSubmitSubmissionIngredients() {
  return useMutation({
    mutationFn: ({ submissionId, labelUrls }: { submissionId: number; labelUrls: string[] }) =>
      submissionsApi.submitIngredients(submissionId, labelUrls),
  });
}

export function useSubmitSubmissionProductImage() {
  return useMutation({
    mutationFn: ({ submissionId, url }: { submissionId: number; url: string }) =>
      submissionsApi.submitProductImage(submissionId, url),
  });
}

// Finalize commits awarded points; refresh the profile/leaderboard caches so the
// new total shows up (same keys useCorrections/useActivity invalidate).
export function useFinalizeSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: number) => submissionsApi.submit(submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

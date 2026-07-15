import { submissionsApi } from './api';
import type { UploadAsset } from '@/features/corrections/uploadImage';

// Max label images per submission — mirrors SUBMISSION_MAX_LABEL_IMAGES on the API.
export const MAX_SUBMISSION_IMAGES = 10;

// Uploads a local image (from expo-image-picker) to the submission image folder
// via a GCS signed URL and returns its public URL. Mirrors uploadCorrectionImage.
// Throws on failure.
export async function uploadSubmissionImage(asset: UploadAsset): Promise<string> {
  const urlData = await submissionsApi.imageUploadUrl();
  if (!urlData) throw new Error('Failed to upload image. Please try again.');

  const blob = await fetch(asset.uri).then((r) => r.blob());
  const res = await fetch(urlData.upload_url, {
    method: 'PUT',
    body: blob,
    // The signed URL is issued for this exact content type; it must match.
    headers: { 'Content-Type': urlData.content_type },
  });
  if (!res.ok) throw new Error('Failed to upload image. Please try again.');

  return urlData.public_url;
}

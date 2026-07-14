import { correctionsApi } from './api';

// Max label images per ingredients/bonus correction — used by the UI to cap the
// number of label photos a user can attach.
export const MAX_CORRECTION_IMAGES = 10;

// Minimal shape we need from an expo-image-picker asset.
export interface UploadAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

// Uploads a local image (from expo-image-picker) to the correction image folder
// via a GCS signed URL and returns its public URL. Mirrors the review upload flow
// in src/components/product/ReviewSheet.tsx. Throws on failure.
export async function uploadCorrectionImage(asset: UploadAsset): Promise<string> {
  const urlData = await correctionsApi.imageUploadUrl();
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

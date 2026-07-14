import { correctionsApi } from './api';

// Uploads a local image (from expo-image-picker) to the correction image
// folder via a GCS signed URL and returns its public URL. Mirrors the review
// upload flow in src/components/product/ReviewSheet.tsx. Throws on failure.
export async function uploadCorrectionImage(uri: string): Promise<string> {
  const urlData = await correctionsApi.imageUploadUrl();
  if (!urlData) throw new Error('Failed to get upload URL');

  const blob = await fetch(uri).then((r) => r.blob());
  const res = await fetch(urlData.upload_url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': urlData.content_type },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

  return urlData.public_url;
}

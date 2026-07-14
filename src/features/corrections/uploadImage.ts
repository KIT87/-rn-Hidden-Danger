import { Platform } from 'react-native';
import { ApiError } from '@/api/client';
import { correctionsApi } from './api';

// Max label images per ingredients/bonus correction — mirrors the server's
// HiddenDanger::Constants::MAX_CORRECTION_IMAGES so the UI can cap before upload.
export const MAX_CORRECTION_IMAGES = 10;

// Kept in sync with Storage::ImageUploader on the backend (magic-byte validated
// server-side; these client checks just give a friendlier message up front).
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// Minimal shape we need from an expo-image-picker asset.
export interface UploadAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

// Uploads a local image (from expo-image-picker) to the correction image folder
// via POST corrections/image_upload (server-side multipart → GCS) and returns its
// public URL. Throws an Error with a user-facing message on failure.
export async function uploadCorrectionImage(asset: UploadAsset): Promise<string> {
  const type = asset.mimeType ?? 'image/jpeg';
  const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.jpg';

  // Friendly pre-flight guards (the server enforces these authoritatively too).
  if (asset.fileSize != null && asset.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error('That image is too large (max 20 MB).');
  }
  if (asset.mimeType && !ALLOWED_MIME.includes(asset.mimeType)) {
    throw new Error("That image type isn't supported. Use JPEG, PNG, WebP or HEIC.");
  }

  const form = new FormData();
  if (Platform.OS === 'web') {
    // Web FormData needs a real Blob rather than a { uri } descriptor.
    const blob = await fetch(asset.uri).then((r) => r.blob());
    form.append('file', blob, name);
  } else {
    form.append('file', { uri: asset.uri, name, type } as any);
  }

  try {
    const res = await correctionsApi.uploadImage(form);
    if (!res) throw new Error('Failed to upload image. Please try again.');
    return res.public_url;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 502) throw new Error('Upload failed on the server. Please try again.');
      if (e.status === 422) {
        const msg = typeof e.body?.error === 'string' ? e.body.error : '';
        if (msg.includes('large')) throw new Error('That image is too large (max 20 MB).');
        if (msg.includes('type')) throw new Error("That image type isn't supported. Use JPEG, PNG, WebP or HEIC.");
        throw new Error('That image could not be processed. Please try another.');
      }
    }
    throw e instanceof Error ? e : new Error('Failed to upload image. Please try again.');
  }
}

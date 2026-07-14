# Report Wrong Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user report incorrect product data (brand, product name, ingredients) through a full-screen wizard that earns gamification points, backed by the already-shipped `products/:id/corrections` API.

**Architecture:** One dedicated entry button on the product screen navigates to a single full-screen route (`report/[id].tsx`) that drives an internal step state machine. A thin data layer (`src/features/corrections/`) wraps the correction endpoints and image upload. Photos use the native camera via `expo-image-picker`; barcode uses an inline `expo-camera` view. Points come back per step and are committed on finalize.

**Tech Stack:** Expo Router v6, React Native, NativeWind v4 (className), TanStack React Query v5, expo-camera, expo-image-picker, existing encrypted API client (`@/api/client`).

## Global Constraints

- Always use `bun` (never npm/yarn). Verification gate for every task: `bun run typecheck` must pass (repo has **no** unit-test framework; do not add one — verify with typecheck + manual app driving).
- All correction endpoints require Bearer auth and are AES-256-GCM encrypted — this is handled transparently by the existing `api.get`/`api.post` client; do not touch crypto.
- Corrections live in a separate table and **never** mutate the live product.
- API contract (verbatim from `~/Documents/Obsidian Documents/hidden-danger.ai/api/endpoints.md` → "Product corrections"):
  - `POST products/:id/corrections` body `{ types: ("brand"|"product_name"|"ingredients")[] }` → `201 { report_id }`; resumes an unsubmitted draft; `422 { error: "Product already reported" }` after submit.
  - `POST corrections/:report_id/brand` `{ suggested_brand }` → `{ points_awarded: 1, points_pending: 1 }`.
  - `POST corrections/:report_id/name` `{ suggested_name }` → `{ points_awarded: 1, points_pending: 1 }`.
  - `POST corrections/:report_id/ingredients` `{ label_image_urls: string[], product_image_url?, barcode? }` → `{ points_awarded: 10, points_pending: 10 }`. ≥1 label image mandatory.
  - `POST corrections/:report_id/bonus` `{ product_image_url?, barcode?, label_image_urls: string[] }` → `{ points_awarded: 10, points_pending: 0 }`. ≥1 label image mandatory. Mutually exclusive with ingredients.
  - `POST corrections/:report_id/submit` → `{ points_awarded_total, points_pending_total, points_total }`. Idempotent; commits awarded points.
  - `GET corrections/image_upload_url` → `{ upload_url, file_path, public_url, content_type }`. `PUT` the JPEG blob to `upload_url` with `Content-Type: image/jpeg`, then pass `public_url`.
- Glass theme: import tokens from `@/theme/glass` (`GLASS.cardBg`, `GLASS.cardBgStrong`, `GLASS.cardBorder`, `GLASS.chipBg`); primary button color `#7c3aed`; accent `#c4b5fd`; white text.

## File Structure

- Create `src/features/corrections/api.ts` — `correctionsApi` (all 7 endpoints).
- Create `src/features/corrections/useCorrections.ts` — React Query mutation hooks.
- Create `src/features/corrections/uploadImage.ts` — `uploadCorrectionImage(uri)` helper.
- Create `src/components/report/BarcodeCaptureView.tsx` — value-only barcode scanner.
- Create `app/(tabs)/(details)/report/[id].tsx` — the wizard route (auto-registered by the existing `(details)` `<Stack>`; no layout edit needed).
- Modify `src/features/products/types.ts` — add correction types.
- Modify `src/lib/storage/secure.ts` — add `hide_report_intro` flag helpers.
- Modify `app/(tabs)/(details)/product/[id].tsx` — add the "Report wrong data" button.
- Modify memory `glass-redesign.md` + `MEMORY.md` (final task).

---

### Task 1: Correction data layer (types, API, hooks, upload helper)

**Files:**
- Modify: `src/features/products/types.ts` (append new interfaces at end of file)
- Create: `src/features/corrections/api.ts`
- Create: `src/features/corrections/uploadImage.ts`
- Create: `src/features/corrections/useCorrections.ts`

**Interfaces:**
- Consumes: `api` from `@/api/client`; `ImageUploadUrlResponse` from `@/features/products/types`; `useMutation`, `useQueryClient` from `@tanstack/react-query`.
- Produces:
  - Types: `CorrectionType`, `CreateReportResponse`, `CorrectionPoints`, `IngredientsCorrectionPayload`, `BonusCorrectionPayload`, `CorrectionSubmitResponse`.
  - `correctionsApi.{createReport, submitBrand, submitName, submitIngredients, submitBonus, submit, imageUploadUrl}`.
  - `uploadCorrectionImage(uri: string): Promise<string>`.
  - Hooks: `useCreateReport()` (`mutateAsync({ productId, types })`), `useSubmitBrand()`/`useSubmitName()` (`mutateAsync({ reportId, value })`), `useSubmitIngredients()`/`useSubmitBonus()` (`mutateAsync({ reportId, payload })`), `useFinalizeReport()` (`mutateAsync(reportId)`).

- [ ] **Step 1: Add correction types**

Append to `src/features/products/types.ts`:

```ts
// ─── Product corrections (report wrong data) ───────────────────────────────
export type CorrectionType = 'brand' | 'product_name' | 'ingredients';

export interface CreateReportResponse {
  report_id: number;
}

export interface CorrectionPoints {
  points_awarded: number;
  points_pending: number;
}

export interface IngredientsCorrectionPayload {
  label_image_urls: string[];
  product_image_url?: string;
  barcode?: string;
}

export interface BonusCorrectionPayload {
  product_image_url?: string;
  barcode?: string;
  label_image_urls: string[];
}

export interface CorrectionSubmitResponse {
  points_awarded_total: number;
  points_pending_total: number;
  points_total: number;
}
```

- [ ] **Step 2: Create the API module**

Create `src/features/corrections/api.ts`:

```ts
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
```

- [ ] **Step 3: Create the image upload helper**

Create `src/features/corrections/uploadImage.ts`:

```ts
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
```

- [ ] **Step 4: Create the hooks**

Create `src/features/corrections/useCorrections.ts`:

```ts
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
```

- [ ] **Step 5: Verify types compile**

Run: `bun run typecheck`
Expected: `$ tsc --noEmit` with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/products/types.ts src/features/corrections
git commit -m "feat(corrections): add report-wrong-data data layer (types, api, hooks)"
```

---

### Task 2: Secure-storage intro flag

**Files:**
- Modify: `src/lib/storage/secure.ts`

**Interfaces:**
- Produces: `storage.getHideReportIntro(): Promise<string | null>`, `storage.setHideReportIntro(hide: boolean): Promise<void>`. Stored value is the string `'true'` / `'false'`; the wizard reads it as `value === 'true'`.

- [ ] **Step 1: Add the key constant**

In `src/lib/storage/secure.ts`, after the `LAST_APP_OPEN_KEY` line (currently line 7), add:

```ts
const HIDE_REPORT_INTRO_KEY = 'hide_report_intro';
```

- [ ] **Step 2: Add the getter/setter**

In the `storage` object, after the `getLastAppOpen`/`setLastAppOpen` pair, add:

```ts
  // Whether the user checked "don't show again" on the report-wrong-data intro.
  getHideReportIntro: () => store.getItemAsync(HIDE_REPORT_INTRO_KEY),
  setHideReportIntro: (hide: boolean) =>
    store.setItemAsync(HIDE_REPORT_INTRO_KEY, hide ? 'true' : 'false'),
```

- [ ] **Step 3: Clear on logout**

In the `clear` function, after the `LAST_APP_OPEN_KEY` delete line, add:

```ts
    await store.deleteItemAsync(HIDE_REPORT_INTRO_KEY);
```

- [ ] **Step 4: Verify**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/secure.ts
git commit -m "feat(corrections): persist report intro 'don't show again' flag"
```

---

### Task 3: Barcode capture component

**Files:**
- Create: `src/components/report/BarcodeCaptureView.tsx`

**Interfaces:**
- Consumes: `CameraView`, `useCameraPermissions`, `BarcodeScanningResult` from `expo-camera`; `AppText` from `@/components/ui`.
- Produces: `BarcodeCaptureView({ onScanned: (code: string) => void, onClose: () => void })` — a full-screen scanner that calls `onScanned` with the raw barcode string (no product lookup).

- [ ] **Step 1: Create the component**

Create `src/components/report/BarcodeCaptureView.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';

// Full-screen barcode scanner that returns the scanned value only (no product
// lookup / navigation). Barcode settings mirror app/(tabs)/scan.tsx.
export function BarcodeCaptureView({ onScanned, onClose }: {
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <AppText className="text-white text-center">Camera access is needed to scan a barcode.</AppText>
        <Pressable onPress={requestPermission} className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#7c3aed' }}>
          <AppText className="text-white font-semibold">Grant access</AppText>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8}>
          <AppText className="text-white/70">Cancel</AppText>
        </Pressable>
      </View>
    );
  }

  const handle = (r: BarcodeScanningResult) => {
    if (r.data) onScanned(r.data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handle}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 40, alignItems: 'center' }}>
        <AppText className="text-white/90">Point at the product barcode</AppText>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/BarcodeCaptureView.tsx
git commit -m "feat(corrections): add value-only barcode capture view"
```

---

### Task 4: Wizard route (state machine + all steps)

**Files:**
- Create: `app/(tabs)/(details)/report/[id].tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 1–3; `useLocalSearchParams`, `router` from `expo-router`; `AppInput`, `AppText`, `AppToast`, `ScreenGradient`, `useToast` from `@/components/ui`; `GLASS` from `@/theme/glass`; `ApiError` from `@/api/client`; `storage` from `@/lib/storage/secure`; `ImagePicker` from `expo-image-picker`.
- Produces: the route `/report/:id` (a default-exported screen component). No exports consumed by other tasks.

This route is auto-registered by the existing `app/(tabs)/(details)/_layout.tsx` `<Stack>` — no layout file change is needed. The URL is `/report/:id` (route groups are invisible), keeping the bottom tab bar visible per the app's persistent-tab-bar convention.

- [ ] **Step 1: Create the wizard screen**

Create `app/(tabs)/(details)/report/[id].tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppInput, AppText, AppToast, ScreenGradient, useToast } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { ApiError } from '@/api/client';
import { storage } from '@/lib/storage/secure';
import { BarcodeCaptureView } from '@/components/report/BarcodeCaptureView';
import { uploadCorrectionImage } from '@/features/corrections/uploadImage';
import {
  useCreateReport,
  useFinalizeReport,
  useSubmitBonus,
  useSubmitBrand,
  useSubmitIngredients,
  useSubmitName,
} from '@/features/corrections/useCorrections';
import type { CorrectionSubmitResponse, CorrectionType } from '@/features/products/types';

type Step = 'intro' | 'types' | 'brand' | 'name' | 'ingredients' | 'bonus' | 'thanks';

const TYPE_OPTIONS: {
  value: CorrectionType;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'brand', label: 'Brand', hint: 'The brand name is wrong', icon: 'pricetag-outline' },
  { value: 'product_name', label: 'Product name', hint: 'The product name is wrong', icon: 'text-outline' },
  { value: 'ingredients', label: 'Ingredients', hint: 'The ingredient list is wrong', icon: 'flask-outline' },
];

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
  borderRadius: 20,
};

export default function ReportWrongDataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const insets = useSafeAreaInsets();
  const { toastConfig, showToast } = useToast();

  const createReport = useCreateReport();
  const submitBrand = useSubmitBrand();
  const submitName = useSubmitName();
  const submitIngredients = useSubmitIngredients();
  const submitBonus = useSubmitBonus();
  const finalize = useFinalizeReport();

  const [hideIntro, setHideIntro] = useState<boolean | null>(null); // null = loading
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [types, setTypes] = useState<Set<CorrectionType>>(new Set());
  const [reportId, setReportId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [labelUrls, setLabelUrls] = useState<string[]>([]);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [result, setResult] = useState<CorrectionSubmitResponse | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storage.getHideReportIntro().then((v) => setHideIntro(v === 'true'));
  }, []);

  // Ordered steps, derived from the chosen types. Bonus is offered only when the
  // ingredients step is NOT taken (they are mutually exclusive server-side).
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];
    if (hideIntro === false) s.push('intro');
    s.push('types');
    if (types.has('brand')) s.push('brand');
    if (types.has('product_name')) s.push('name');
    if (types.has('ingredients')) s.push('ingredients');
    else s.push('bonus');
    s.push('thanks');
    return s;
  }, [hideIntro, types]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];

  // Finalize exactly once, when the thank-you step is reached.
  useEffect(() => {
    if (step === 'thanks' && reportId != null && !result && !finalize.isPending) {
      finalize
        .mutateAsync(reportId)
        .then((r) => { if (r) setResult(r); })
        .catch(() => showToast('Could not finalize your report. Please try again.'));
    }
  }, [step, reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleType(t: CorrectionType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function goNext() { setStepIndex((i) => i + 1); }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.back();
  }

  async function pickCamera() {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return null;
    return res.assets[0];
  }

  async function addLabelPhoto() {
    const asset = await pickCamera();
    if (!asset) return;
    setUploading(true);
    try {
      const url = await uploadCorrectionImage(asset.uri);
      setLabelUrls((u) => [...u, url]);
    } catch {
      showToast('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function setProductPhoto() {
    const asset = await pickCamera();
    if (!asset) return;
    setUploading(true);
    try {
      setProductUrl(await uploadCorrectionImage(asset.uri));
    } catch {
      showToast('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleContinue() {
    setBusy(true);
    try {
      switch (step) {
        case 'intro':
          if (dontShowAgain) await storage.setHideReportIntro(true);
          goNext();
          break;
        case 'types': {
          const res = await createReport.mutateAsync({ productId, types: Array.from(types) });
          if (res) setReportId(res.report_id);
          goNext();
          break;
        }
        case 'brand':
          if (reportId != null) await submitBrand.mutateAsync({ reportId, value: brand.trim() });
          goNext();
          break;
        case 'name':
          if (reportId != null) await submitName.mutateAsync({ reportId, value: name.trim() });
          goNext();
          break;
        case 'ingredients':
          if (reportId != null) {
            await submitIngredients.mutateAsync({
              reportId,
              payload: {
                label_image_urls: labelUrls,
                product_image_url: productUrl ?? undefined,
                barcode: barcode ?? undefined,
              },
            });
          }
          goNext();
          break;
        case 'bonus':
          if (reportId != null) {
            await submitBonus.mutateAsync({
              reportId,
              payload: {
                label_image_urls: labelUrls,
                product_image_url: productUrl ?? undefined,
                barcode: barcode ?? undefined,
              },
            });
          }
          goNext();
          break;
      }
    } catch (e) {
      if (step === 'types' && e instanceof ApiError && e.status === 422) {
        setAlreadyReported(true);
      } else {
        showToast('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const canContinue = (() => {
    switch (step) {
      case 'types': return types.size > 0;
      case 'brand': return brand.trim().length > 0;
      case 'name': return name.trim().length > 0;
      case 'ingredients':
      case 'bonus': return labelUrls.length > 0 && !uploading;
      default: return true;
    }
  })();

  // The barcode scanner takes over the whole screen while active.
  if (scanning) {
    return (
      <BarcodeCaptureView
        onScanned={(code) => { setBarcode(code); setScanning(false); }}
        onClose={() => setScanning(false)}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />

      {/* Header + progress */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 px-4" style={{ height: 48 }}>
          <Pressable onPress={goBack} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: GLASS.chipBg }}>
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
          <AppText variant="label" className="flex-1 text-center text-white">Report wrong data</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: GLASS.chipBg }}>
            <Ionicons name="close" size={18} color="#ffffff" />
          </Pressable>
        </View>
        <View className="mx-4 mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <View style={{ height: '100%', width: `${((stepIndex + 1) / steps.length) * 100}%`, backgroundColor: '#c4b5fd' }} />
        </View>
      </View>

      {hideIntro === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : alreadyReported ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Ionicons name="checkmark-circle-outline" size={52} color="rgba(255,255,255,0.7)" />
          <AppText variant="body" className="text-white/80 text-center">
            You've already reported this product. Thanks for helping keep the data accurate.
          </AppText>
          <Pressable onPress={() => router.back()} className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#7c3aed' }}>
            <AppText className="text-white font-semibold">Back to product</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {step === 'intro' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">Help fix this product</AppText>
                <AppText variant="body" className="text-white/75 leading-relaxed">
                  Spotted something wrong? Report it and earn points. Your report goes to our moderators — it won't change the product until it's verified.
                </AppText>
                <View className="p-4 gap-2" style={glassCard}>
                  <AppText variant="caption" className="text-white/80">• Correct the brand or product name (2 pts each)</AppText>
                  <AppText variant="caption" className="text-white/80">• Report wrong ingredients with photos (up to 20 pts)</AppText>
                  <AppText variant="caption" className="text-white/80">• Pending points are credited once a moderator verifies your report</AppText>
                </View>
                <Pressable onPress={() => setDontShowAgain((v) => !v)} className="flex-row items-center gap-3 active:opacity-70">
                  <View className="w-6 h-6 rounded-md items-center justify-center" style={{ backgroundColor: dontShowAgain ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: GLASS.cardBorder }}>
                    {dontShowAgain && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <AppText variant="body" className="text-white/85">Don't show this again</AppText>
                </Pressable>
              </View>
            )}

            {step === 'types' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">What's wrong?</AppText>
                <AppText variant="body" className="text-white/70">Select everything that needs fixing.</AppText>
                {TYPE_OPTIONS.map((opt) => {
                  const on = types.has(opt.value);
                  return (
                    <Pressable key={opt.value} onPress={() => toggleType(opt.value)} className="flex-row items-center gap-3 rounded-2xl p-4 active:opacity-80" style={{ backgroundColor: on ? GLASS.cardBgStrong : GLASS.cardBg, borderWidth: 1, borderColor: on ? '#c4b5fd' : GLASS.cardBorder }}>
                      <Ionicons name={opt.icon} size={22} color="#c4b5fd" />
                      <View className="flex-1">
                        <AppText variant="label" className="text-white">{opt.label}</AppText>
                        <AppText variant="caption" className="text-white/60">{opt.hint}</AppText>
                      </View>
                      <View className="w-6 h-6 rounded-md items-center justify-center" style={{ backgroundColor: on ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: GLASS.cardBorder }}>
                        {on && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 'brand' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">Correct the brand</AppText>
                <AppInput tone="glass" label="Suggested brand name" value={brand} onChangeText={setBrand} placeholder="e.g. Acme Cosmetics" />
              </View>
            )}

            {step === 'name' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">Correct the product name</AppText>
                <AppInput tone="glass" label="Suggested product name" value={name} onChangeText={setName} placeholder="e.g. Hydrating Shampoo 500ml" />
              </View>
            )}

            {(step === 'ingredients' || step === 'bonus') && (
              <View className="gap-5">
                <View className="gap-1">
                  <AppText variant="heading" className="text-white">
                    {step === 'ingredients' ? 'Report wrong ingredients' : 'Add supporting evidence'}
                  </AppText>
                  <AppText variant="body" className="text-white/70">
                    Add at least one clear photo of the ingredient label. A product photo and barcode are optional but help verification.
                  </AppText>
                </View>

                {/* Label photos (mandatory) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">Ingredient label photos *</AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {labelUrls.map((url, i) => (
                      <View key={url} className="rounded-xl overflow-hidden" style={{ width: 84, height: 84 }}>
                        <Image source={{ uri: url }} style={{ width: 84, height: 84 }} />
                        <Pressable onPress={() => setLabelUrls((u) => u.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="close" size={14} color="#ffffff" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable onPress={addLabelPhoto} disabled={uploading} className="items-center justify-center rounded-xl" style={{ width: 84, height: 84, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                      {uploading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="camera-outline" size={24} color="#ffffff" />}
                    </Pressable>
                  </View>
                </View>

                {/* Product photo (optional) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">Product photo (optional)</AppText>
                  {productUrl ? (
                    <View className="rounded-xl overflow-hidden" style={{ width: 84, height: 84 }}>
                      <Image source={{ uri: productUrl }} style={{ width: 84, height: 84 }} />
                      <Pressable onPress={() => setProductUrl(null)} style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={setProductPhoto} disabled={uploading} className="items-center justify-center rounded-xl" style={{ width: 84, height: 84, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                      <Ionicons name="camera-outline" size={24} color="#ffffff" />
                    </Pressable>
                  )}
                </View>

                {/* Barcode (optional) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">Barcode (optional)</AppText>
                  <Pressable onPress={() => setScanning(true)} className="flex-row items-center gap-2 rounded-2xl px-4 py-3 active:opacity-80" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                    <Ionicons name="barcode-outline" size={18} color="#ffffff" />
                    <AppText className="text-white/90">{barcode ?? 'Scan barcode'}</AppText>
                  </Pressable>
                </View>
              </View>
            )}

            {step === 'thanks' && (
              <View className="items-center gap-4 pt-6">
                <Ionicons name="checkmark-circle" size={64} color="#c4b5fd" />
                <AppText variant="heading" className="text-white text-center">Thank you!</AppText>
                {finalize.isPending || !result ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View className="items-center gap-2">
                    <AppText variant="body" className="text-white/85 text-center">You earned</AppText>
                    <AppText className="text-white" style={{ fontSize: 40, fontWeight: '900' }}>{result.points_awarded_total} pts</AppText>
                    {result.points_pending_total > 0 && (
                      <AppText variant="caption" className="text-white/70 text-center">
                        +{result.points_pending_total} pending — credited once a moderator verifies your report.
                      </AppText>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
            {step === 'bonus' && (
              <Pressable onPress={goNext} className="items-center py-2 active:opacity-70">
                <AppText className="text-white/70">Skip this step</AppText>
              </Pressable>
            )}
            {step === 'thanks' ? (
              <Pressable onPress={() => router.back()} className="items-center justify-center rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: '#7c3aed' }}>
                <AppText className="text-white font-semibold">Done</AppText>
              </Pressable>
            ) : (
              <Pressable onPress={handleContinue} disabled={!canContinue || busy} className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: canContinue && !busy ? '#7c3aed' : 'rgba(124,58,237,0.4)' }}>
                {busy ? <ActivityIndicator color="#ffffff" /> : <AppText className="text-white font-semibold">Continue</AppText>}
              </Pressable>
            )}
          </View>
        </>
      )}

      <AppToast config={toastConfig} />
    </View>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual smoke test (text-only path)**

Run: `bun run web` (or `bun run ios`). Deep-link to a product, then in the browser address bar go to `/report/<some-product-id>` (or use the Task 5 button once it exists). Confirm: intro shows with checkbox → "What's wrong?" lets you pick Brand + Product name → brand/name text steps require input → thank-you shows earned points. (This exercises `create`, `brand`, `name`, `submit`.)

Expected: reaches thank-you with `2` + `2` = **4 pts** earned, `4` pending, and no console errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/(details)/report/[id].tsx"
git commit -m "feat(corrections): add report-wrong-data wizard route"
```

---

### Task 5: Product screen entry button

**Files:**
- Modify: `app/(tabs)/(details)/product/[id].tsx` (insert after the Ingredients block, before the `{/* Reviews */}` comment — currently around line 725–727)

**Interfaces:**
- Consumes: `router` (already imported), `Ionicons` (already imported), `AppText` (already imported), `GLASS` (already imported), `productId` (already in scope).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the button**

In `app/(tabs)/(details)/product/[id].tsx`, immediately after the Ingredients conditional block (the one ending `) : null}` right before `{/* Reviews */}`), insert:

```tsx
            {/* Report wrong data */}
            <Pressable
              onPress={() => router.push(`/report/${productId}` as never)}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
              style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
            >
              <Ionicons name="flag-outline" size={16} color="#ffffff" />
              <AppText variant="label" className="text-white font-semibold">Report wrong data</AppText>
            </Pressable>
```

- [ ] **Step 2: Verify types compile**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual end-to-end test (ingredients + bonus paths)**

Run the app, open any product, scroll past ingredients, tap **Report wrong data**.
- **Ingredients path:** choose "Ingredients" only → capture step requires ≥1 label photo before Continue enables → add a label photo (camera opens, uploads, thumbnail appears), optionally a product photo and a scanned barcode → Continue → thank-you shows **10 pts** earned, **10 pending**. Confirm no "bonus" step appeared.
- **Bonus path:** re-open (a second product to avoid "already reported"), choose "Brand" only → after the brand step a **bonus** capture step appears with a "Skip this step" link; skipping goes straight to thank-you (**2 pts**), engaging it requires a label photo.
- Confirm profile points increase after finalize (open Hub/profile).

Expected: correct step skipping, label-photo gating, points totals matching the table, profile refreshes.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/(details)/product/[id].tsx"
git commit -m "feat(corrections): add report-wrong-data entry button on product screen"
```

---

### Task 6: Documentation & memory update

**Files:**
- Modify: `/Users/kit/.claude/projects/-Users-kit-Programming-apps-hiddendanger/memory/glass-redesign.md`
- Modify: `/Users/kit/.claude/projects/-Users-kit-Programming-apps-hiddendanger/memory/MEMORY.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Append a rollout note to `glass-redesign.md`**

Add a bullet documenting the feature: the `src/features/corrections/` data layer, the `report/[id].tsx` wizard (intro/types/brand/name/ingredients-or-bonus/thanks state machine), the `BarcodeCaptureView`, the `hide_report_intro` secure-storage flag, the product-screen entry button after the ingredients section, per-step point values (brand 1+1 / name 1+1 / ingredients 10+10 / bonus 10+0), and that `submit` commits awarded points + invalidates `['profile']`/`['leaderboard']`.

- [ ] **Step 2: Add a MEMORY.md index line if warranted**

Only if the report feature deserves its own index entry; otherwise the `glass-redesign.md` update suffices.

- [ ] **Step 3: Final full verify**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(corrections): record report-wrong-data feature in memory"
```

---

## Self-Review

**1. Spec coverage** (checked against `2026-07-14-report-wrong-data-design.md`):
- Product-screen entry point → Task 5. ✅
- Full-screen wizard + step state machine + progress bar → Task 4. ✅
- Intro + "don't show again" (secure storage) → Task 2 + Task 4. ✅
- Multiselect what's wrong → `create` → Task 4 (`types` step). ✅
- Brand / name text steps → Task 4. ✅
- Ingredients capture (≥1 label mandatory, product photo + barcode optional) → Task 4. ✅
- Bonus (only when ingredients skipped, mutually exclusive, skippable) → Task 4 (`steps` derivation + Skip button). ✅
- Thank-you with earned + pending from `submit` → Task 4. ✅
- Per-step endpoints + image upload + hooks → Task 1. ✅
- Barcode value-only capture → Task 3. ✅
- Cache invalidation on finalize → Task 1 (`useFinalizeReport`). ✅
- Error handling: part POST failure toast + stay, upload failure toast, `Product already reported` state, blank-text/label gating → Task 4 (`handleContinue` catch, `canContinue`, `alreadyReported`). ✅

**2. Placeholder scan:** No TBD/TODO; every code step contains complete code. ✅

**3. Type consistency:** Hook argument shapes (`{ productId, types }`, `{ reportId, value }`, `{ reportId, payload }`, `reportId`) defined in Task 1 match every call site in Task 4. `CorrectionType`, `CorrectionSubmitResponse` names consistent across tasks. `storage.getHideReportIntro`/`setHideReportIntro` defined in Task 2 match Task 4 usage. `BarcodeCaptureView({ onScanned, onClose })` defined in Task 3 matches Task 4 usage. `uploadCorrectionImage(uri)` defined in Task 1 matches Task 4 usage. ✅

## Notes for the implementer

- `expo-image-picker`'s `launchCameraAsync` prompts for camera permission itself; no extra permission plumbing is needed for photos. The barcode view (`expo-camera`) handles its own permission via `useCameraPermissions` (Task 3).
- Each part endpoint is POSTed as the user completes its step (so points return incrementally); `submit` on the thank-you screen is the authoritative total shown. Do not sum client-side for the displayed total — read `submit`'s response.
- `create` resuming an unsubmitted draft means re-entering the wizard for the same product before submit is safe; after submit it yields the `alreadyReported` state.

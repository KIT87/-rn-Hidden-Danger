# Report Wrong Data — Design

**Date:** 2026-07-14
**Status:** Approved for planning

## Goal

Let a signed-in user report incorrect product data (brand, product name, ingredients) through a short full-screen wizard, earning gamification points. Corrections are stored server-side in a separate moderator-review area and **never** mutate the live catalog product. Backend endpoints are already shipped (see `~/Documents/Obsidian Documents/hidden-danger.ai/api/endpoints.md` → "Product corrections (report wrong data)").

## Scope

In scope (client only):
- A "Report wrong data" entry point on the product screen.
- A full-screen wizard route driving a step state machine.
- API client + hooks for the correction endpoints, image upload, and barcode capture.
- Points feedback (running total + thank-you summary), profile/leaderboard cache invalidation.

Out of scope:
- Backend / moderation UI (already built; moderator verification of pending points is a future feature).
- Editing/resubmitting an already-submitted report (server enforces one completed report per product per user).

## Backend contract (already shipped)

All endpoints require `Authorization: Bearer <token>` and are AES-256-GCM encrypted like the rest of `/api/v1`. Corrections live in a separate table; the live product is never mutated.

| # | Endpoint | Method | Request | Success response |
|---|----------|--------|---------|------------------|
| 1 | `products/:id/corrections` | POST | `{ types: ["brand","product_name","ingredients"] }` | `201 { report_id }` (creates, or resumes an unsubmitted draft) |
| 2 | `corrections/:report_id/brand` | POST | `{ suggested_brand }` | `200 { points_awarded: 1, points_pending: 1 }` |
| 3 | `corrections/:report_id/name` | POST | `{ suggested_name }` | `200 { points_awarded: 1, points_pending: 1 }` |
| 4 | `corrections/:report_id/ingredients` | POST | `{ label_image_urls: [...], product_image_url?, barcode? }` | `200 { points_awarded: 10, points_pending: 10 }` |
| 5 | `corrections/:report_id/bonus` | POST | `{ product_image_url?, barcode?, label_image_urls: [...] }` | `200 { points_awarded: 10, points_pending: 0 }` |
| 6 | `corrections/:report_id/submit` | POST | — | `200 { points_awarded_total, points_pending_total, points_total }` |
| 7 | `corrections/image_upload_url` | GET | — | `{ upload_url, file_path, public_url, content_type }` |

Contract rules the client must honor:
- **One completed report per product per user.** `create` resumes an existing unsubmitted draft (same `report_id`); it only fails after submit with `422 { error: "Product already reported" }`.
- **Ingredients and bonus are mutually exclusive** on a report (server rejects the second with `422`). The wizard shows *bonus only when ingredients was not chosen*, so this never fires in normal flow.
- Ingredients/bonus require **≥1 label image**; `product_image_url` and `barcode` are **optional**. Missing label → `422`.
- Points per step are **flat** (not summed from sub-items). Awarded points hit `points_total` only at **submit**; pending points are recorded but not yet credited.
- `submit` is idempotent — resubmitting returns stored totals without re-crediting.
- Image upload mirrors the existing review flow: `PUT` the JPEG blob to `upload_url` with `Content-Type: image/jpeg`, then pass `public_url` into the ingredients/bonus payload. Folder is `user_correction_image/`.

## 1. Product screen entry point

`app/(tabs)/(details)/product/[id].tsx`:
- Add a full-width **glass secondary button** at the **end of the ingredients section**: flag/alert icon + label **"Report wrong data"**.
- On press → `router.push('/report/' + productId)`.
- Only rendered when a product is loaded. Auth is implicit (all correction endpoints are Bearer-guarded; an unauthenticated user is already redirected to login by the API layer / route guards).

This is the only change to the product screen.

## 2. Wizard architecture

**One full-screen route** — `app/(tabs)/(details)/report/[id].tsx` — hosting an **internal step state machine**. A single route (not one route file per step) keeps the shared draft in one place: chosen types, brand/name suggestions, uploaded image URLs, barcode, and the running point total. The screen renders a top **progress bar** + close/back control and swaps step content.

### Draft state (local, in the route component)

```
{
  reportId: number | null,
  types: Set<'brand' | 'product_name' | 'ingredients'>,
  suggestedBrand: string,
  suggestedName: string,
  labelImageUrls: string[],     // ingredients OR bonus
  productImageUrl: string | null,
  barcode: string | null,
  awardedTotal: number,         // accumulated from step responses (optimistic; submit is source of truth)
  pendingTotal: number,
}
```

### Step sequence

Steps auto-skip based on `types`. Order:

| # | Step | Shown when | Inputs | On "Continue" |
|---|------|-----------|--------|---------------|
| 1 | **Intro / rules** | unless `hide_report_intro` secure-storage flag set | "Don't show again" checkbox | if checked, persist flag; advance |
| 2 | **What's wrong?** | always | multiselect brand / product name / ingredients | `create` report → store `report_id`; compute remaining steps |
| 3 | **Correct brand** | `brand` chosen | text → `suggestedBrand` (required non-blank) | POST `brand`; add returned points |
| 4 | **Correct product name** | `product_name` chosen | text → `suggestedName` (required non-blank) | POST `name`; add returned points |
| 5 | **Wrong ingredients** | `ingredients` chosen | label photos (**≥1 required**), product photo (optional), barcode (optional) | POST `ingredients`; add returned points |
| 6 | **Bonus capture** | `ingredients` **not** chosen | product photo (optional), barcode (optional), label photos (**≥1 required** to submit) — **Skippable** | if engaged: POST `bonus`, add points; if skipped: no call |
| 7 | **Thank you** | always | — | on entry: `submit` → show `points_awarded_total` earned + `points_pending_total` pending; invalidate `['profile']` + `['leaderboard']` |

Notes:
- `create` is called when leaving step 2 (once types are known). Because `create` resumes an unsubmitted draft, re-entering the wizard for the same product returns the same `report_id`.
- Each part endpoint is called when the user completes its step, so the returned points can drive a running total shown in the header/progress area. `submit` on step 7 is the authoritative total.
- Bonus is offered only when ingredients was skipped, so the server-side mutual-exclusivity `422` is never triggered in normal flow.

### Media capture

- **Photos** → `expo-image-picker` `launchCameraAsync` (native camera; same pattern as `src/components/product/ReviewSheet.tsx`). Label photos allow **multiple**; each is uploaded immediately via the signed-URL flow and its `public_url` appended to `labelImageUrls`. Product photo is single. Show per-image upload spinner + thumbnails.
- **Barcode** → an inline `expo-camera` `CameraView` substep (modeled on `app/(tabs)/scan.tsx`) that captures the EAN **value only** — no product lookup, no navigation. Extracted into a shared `BarcodeCaptureView` component.

### Upload helper

Reuse the review upload sequence against the correction endpoint:
1. `GET corrections/image_upload_url` → `{ upload_url, public_url, content_type }`
2. `fetch(asset.uri).blob()` → `PUT upload_url` with `Content-Type: content_type`
3. store `public_url`

## 3. Client code layout

- `src/features/corrections/types.ts` (or extend `src/features/products/types.ts`):
  - `CorrectionType = 'brand' | 'product_name' | 'ingredients'`
  - `CorrectionPoints = { points_awarded: number; points_pending: number }`
  - `CreateReportResponse = { report_id: number }`
  - `IngredientsPayload = { label_image_urls: string[]; product_image_url?: string; barcode?: string }`
  - `BonusPayload = { product_image_url?: string; barcode?: string; label_image_urls: string[] }`
  - `SubmitResponse = { points_awarded_total: number; points_pending_total: number; points_total: number }`
  - `CorrectionImageUploadResponse = { upload_url; file_path; public_url; content_type }`
- `src/features/corrections/api.ts` — `correctionsApi`: `createReport(productId, types)`, `submitBrand(reportId, suggested_brand)`, `submitName(...)`, `submitIngredients(reportId, payload)`, `submitBonus(reportId, payload)`, `submit(reportId)`, `imageUploadUrl()`. Uses the existing encrypted `api.get`/`api.post`.
- `src/features/corrections/useCorrections.ts` — thin mutation hooks wrapping each api call; the `submit` hook invalidates `['profile']` and `['leaderboard']` on success.
- `src/components/report/BarcodeCaptureView.tsx` — shared inline barcode scanner (value-only).
- `app/(tabs)/(details)/report/[id].tsx` — the wizard route + step state machine (glass-themed to match the app).
- `src/lib/storage/secure.ts` — add `getHideReportIntro` / `setHideReportIntro` (key `hide_report_intro`).
- `app/(tabs)/(details)/product/[id].tsx` — add the "Report wrong data" button.

## Error handling

- **Network / API failure on a part POST**: show an inline glass toast ("Couldn't save that step, try again"); stay on the step so the user can retry. Do not advance.
- **Image upload failure**: per-image error message; user can retry that image. Continue is blocked until ≥1 label image is present for ingredients/bonus.
- **`Product already reported` (`422` on create)**: replace the wizard body with a friendly "You've already reported this product" state + a back-to-product button.
- **Blank required text**: inline validation, block Continue.
- **User abandons mid-flow**: draft persists server-side (unsubmitted); nothing is credited until `submit`. Re-entry resumes.

## Testing

- Type check clean (`bun run typecheck`).
- Manual: run each `types` combination (brand only / name only / ingredients only / all three / brand+name → bonus offered) and confirm correct step skipping, that bonus appears only when ingredients is skipped, label-image gating, running point total, and that the thank-you totals match `submit` and the profile points refresh.

## Deferred / non-goals (YAGNI)

- No draft list / "resume report" UI — resume is transparent via `create`.
- No editing a submitted report.
- No client rendering of moderator status of pending points (future feature).

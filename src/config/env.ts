/**
 * Single source of truth for environment configuration.
 *
 * All `EXPO_PUBLIC_*` variables are read here (and only here) so the rest of
 * the app imports typed values from `ENV` instead of touching `process.env`.
 * Values are inlined at build time by Expo, so fallbacks below apply only when
 * a variable is missing from `.env` / `.env.local`.
 */
export const ENV = {
  /** Rails backend base URL. */
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1',
  /** Catalog search service base URL (separate from the Rails backend). */
  searchApiUrl: process.env.EXPO_PUBLIC_SEARCH_API_URL ?? 'https://ai-api.hiddendanger.ai/v1',
  /** Path for the catalog search endpoint, relative to `searchApiUrl`. */
  searchApiPath: process.env.EXPO_PUBLIC_SEARCH_API_PATH ?? 'catalog/search',
  /** Static service token for the catalog search service. */
  searchApiToken: process.env.EXPO_PUBLIC_SEARCH_API_TOKEN ?? '',
} as const;

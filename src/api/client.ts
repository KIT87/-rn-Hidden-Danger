import { storage } from '@/lib/storage/secure';
import { decryptApiResponse, DecryptionError } from '@/lib/crypto';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const SEARCH_BASE_URL = process.env.EXPO_PUBLIC_SEARCH_API_URL ?? 'https://ai-api.hiddendanger.ai/v1';
const SEARCH_PATH = process.env.EXPO_PUBLIC_SEARCH_API_PATH ?? 'catalog/search';
const SEARCH_API_TOKEN = process.env.EXPO_PUBLIC_SEARCH_API_TOKEN ?? '';

let unauthorizedHandler: (() => void) | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
  handlingUnauthorized = false;
}

let networkErrorHandler: (() => void) | null = null;

export function setNetworkErrorHandler(handler: () => void) {
  networkErrorHandler = handler;
}

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  baseUrl?: string;
  /** Override the Bearer token (e.g. a static service key). Falls back to the stored user token. */
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const { method = 'GET', body, auth = true, baseUrl = BASE_URL, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (auth) {
    const bearer = token || (await storage.getToken());
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }
  }

  const url = `${baseUrl}/${path.replace(/^\//, '')}`;
  console.log(`[API] ${method} ${url}`, body ?? '');

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error(`[API] Network error — ${method} ${url}`, err);
    networkErrorHandler?.();
    throw err;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const raw = await res.text().catch(() => '');

  let text: string;
  if (raw && contentType.includes('text/plain')) {
    text = decryptApiResponse(raw);
  } else {
    text = raw;
  }

  console.log(`[API] ${res.status} ${url}`, text.slice(0, 500));

  if (!res.ok) {
    if (res.status === 401 && !handlingUnauthorized) {
      handlingUnauthorized = true;
      unauthorizedHandler?.();
    }
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text); } catch { /* raw text */ }
    throw new ApiError(res.status, text || `HTTP ${res.status}`, body);
  }

  return text ? JSON.parse(text) : null;
}

export const api = {
  get:    <T>(path: string, auth = true)                 => request<T>(path, { method: 'GET',    auth }),
  post:   <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST',   body, auth }),
  delete: <T>(path: string, auth = true)                 => request<T>(path, { method: 'DELETE', auth }),
};

// Catalog search lives on a separate service (EXPO_PUBLIC_SEARCH_API_URL) and
// authenticates with its own static service token (EXPO_PUBLIC_SEARCH_API_TOKEN),
// not the per-user session token. Shares the same encrypted-response handling.
export const searchApi = {
  search: <T>(body: unknown, auth = true) =>
    request<T>(SEARCH_PATH, {
      method: 'POST',
      body,
      auth,
      baseUrl: SEARCH_BASE_URL,
      token: SEARCH_API_TOKEN || undefined,
    }),
};

import { storage } from '@/lib/storage/secure';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

let unauthorizedHandler: (() => void) | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
  handlingUnauthorized = false;
}

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
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
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (auth) {
    const token = await storage.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${BASE_URL}/${path.replace(/^\//, '')}`;
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
    throw err;
  }

  const text = await res.text().catch(() => '');
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

import { gcm } from '@noble/ciphers/aes.js';
import { _frags } from './kf';

// ─── Error types ─────────────────────────────────────────────────────────────
// See docs: api/encryption.md § Client error codes

export type DecryptionErrorCode =
  | 'E_DECRYPT_FORMAT'
  | 'E_DECRYPT_AUTH'
  | 'E_DECRYPT_PARSE'
  | 'E_DECRYPT_UNKNOWN';

export class DecryptionError extends Error {
  readonly code: DecryptionErrorCode;
  constructor(code: DecryptionErrorCode, message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DecryptionError';
    this.code = code;
  }
}

// ─── Key assembly ─────────────────────────────────────────────────────────────

function _key(): Uint8Array {
  const masks = [63, 85, 26, 41];
  const out = new Uint8Array(32);
  _frags.forEach((frag, i) =>
    frag.forEach((b, j) => { out[i * 8 + j] = b ^ masks[i]; }),
  );
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < hex.length; i += 2)
    out[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

// Response wire format: {rand32}{iv24}{rand16}{ciphertext}{rand16}{tag32}{rand32}
const FIXED_LEN = 152;

function extractParts(s: string) {
  if (s.length <= FIXED_LEN)
    throw new DecryptionError('E_DECRYPT_FORMAT', `Response too short: ${s.length} chars`);

  let p = 32;
  const iv = s.slice(p, p + 24); p += 24;
  p += 16;
  const ct = s.slice(p, p + s.length - FIXED_LEN); p += s.length - FIXED_LEN;
  p += 16;
  const tag = s.slice(p, p + 32);
  return { iv, ct, tag };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function decryptApiResponse(hex: string): string {
  let parts: ReturnType<typeof extractParts>;
  try {
    parts = extractParts(hex);
  } catch (err) {
    if (err instanceof DecryptionError) throw err;
    throw new DecryptionError('E_DECRYPT_FORMAT', 'Failed to extract response parts', err);
  }

  let plainBytes: Uint8Array;
  try {
    const { iv, ct, tag } = parts;
    const ctBytes = hexToBytes(ct);
    const tagBytes = hexToBytes(tag);
    const payload = new Uint8Array(ctBytes.length + tagBytes.length);
    payload.set(ctBytes);
    payload.set(tagBytes, ctBytes.length);
    plainBytes = gcm(_key(), hexToBytes(iv)).decrypt(payload);
  } catch (err) {
    if (err instanceof DecryptionError) throw err;
    throw new DecryptionError('E_DECRYPT_AUTH', 'AES-GCM authentication failed', err);
  }

  try {
    return new TextDecoder().decode(plainBytes);
  } catch (err) {
    throw new DecryptionError('E_DECRYPT_PARSE', 'Failed to decode decrypted bytes', err);
  }
}

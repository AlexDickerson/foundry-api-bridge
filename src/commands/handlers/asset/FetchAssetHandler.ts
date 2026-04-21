import type { FetchAssetParams, FetchAssetResult } from '@/commands/types';

// Prefixes the module is willing to proxy. Foundry serves lots of routes
// beyond static assets (`/admin/*`, `/setup/*`, `/api/*`, session cookies,
// etc.) and the WS channel has the GM's credentials, so this must be a
// strict whitelist — any path outside these prefixes is rejected even
// before the fetch runs. `/assets/` is omitted on purpose: that's the
// MCP server's SPA bundle, which the server can serve directly.
const ALLOWED_PREFIXES = ['/icons/', '/systems/', '/modules/', '/worlds/', '/ui/'] as const;

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

export interface AssetFetchImpl {
  fetch(path: string): Promise<Response>;
}

// Injectable to keep tests from relying on DOM fetch. Production callers
// use the default which delegates to the browser's global fetch — same
// origin as the Foundry page, so session cookies are sent automatically.
const defaultImpl: AssetFetchImpl = {
  fetch: (path) => fetch(path),
};

export function createFetchAssetHandler(
  impl: AssetFetchImpl = defaultImpl,
): (params: FetchAssetParams) => Promise<FetchAssetResult> {
  return async function fetchAssetHandler(params: FetchAssetParams): Promise<FetchAssetResult> {
    const validation = validatePath(params.path);
    if (validation !== null) {
      return { ok: false, status: 400, error: validation };
    }

    let response: Response;
    try {
      response = await impl.fetch(params.path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 502, error: `fetch failed: ${message}` };
    }

    if (!response.ok) {
      // 404 surfaces as the canonical "asset missing" signal. Any other
      // upstream non-2xx (403, 500, …) is collapsed to 502 so the
      // server doesn't need a branch per Foundry status.
      const status = response.status === 404 ? 404 : 502;
      const error = response.status === 404 ? 'asset not found' : `upstream status ${String(response.status)}`;
      return { ok: false, status, error };
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await response.arrayBuffer();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 502, error: `read failed: ${message}` };
    }

    const contentType = response.headers.get('Content-Type') ?? DEFAULT_CONTENT_TYPE;
    const bytes = encodeBase64(buffer);

    return { ok: true, contentType, bytes };
  };
}

export const fetchAssetHandler = createFetchAssetHandler();

/** Returns null when valid, or an error string describing the rejection reason. */
function validatePath(path: unknown): string | null {
  if (typeof path !== 'string' || path.length === 0) {
    return 'path must be a non-empty string';
  }
  if (!path.startsWith('/')) {
    return 'path must start with /';
  }
  if (path.includes('?') || path.includes('#')) {
    return 'path must not contain query or fragment';
  }
  // Block any `..` segment — plain substring check is enough because
  // any path traversal has to contain the literal `..` somewhere.
  if (path.includes('..')) {
    return 'path must not contain ..';
  }
  const allowed = ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!allowed) {
    return 'path prefix not allowed';
  }
  return null;
}

// Foundry's module runs in the browser where Buffer isn't reliably
// available — node polyfills have been added and removed across the
// VTT's lifetime. Use btoa with String.fromCharCode in 32KB chunks to
// stay well under the spread-operator argument cap on older engines.
function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

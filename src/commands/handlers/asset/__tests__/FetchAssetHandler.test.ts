import { createFetchAssetHandler, type AssetFetchImpl } from '../FetchAssetHandler';
import type { FetchAssetResult } from '@/commands/types';

// Minimal stub of the whatwg Response/Headers surface the handler
// actually reads. Keeping it local avoids depending on whether
// jest's `node` testEnvironment exposes global `Response` (it does on
// Node 18+ but we don't want the test to silently break on older
// Node versions used in CI).
interface StubHeaders {
  get(name: string): string | null;
}

interface StubResponse {
  ok: boolean;
  status: number;
  headers: StubHeaders;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function makeResponse(options: {
  ok?: boolean;
  status?: number;
  body?: ArrayBuffer | Uint8Array;
  contentType?: string | null;
  arrayBufferError?: Error;
}): StubResponse {
  const status = options.status ?? (options.ok === false ? 500 : 200);
  const ok = options.ok ?? (status >= 200 && status < 300);
  // Narrow through unknown: Uint8Array.buffer is ArrayBufferLike, and
  // slice(0) returns that same union in the lib types we have pinned.
  // The production handler only sees the ArrayBuffer branch.
  const buffer: ArrayBuffer =
    options.body instanceof Uint8Array
      ? (options.body.buffer.slice(0) as ArrayBuffer)
      : (options.body ?? new ArrayBuffer(0));
  return {
    ok,
    status,
    headers: {
      get(name: string): string | null {
        if (name.toLowerCase() === 'content-type') {
          return options.contentType ?? null;
        }
        return null;
      },
    },
    arrayBuffer: (): Promise<ArrayBuffer> => {
      if (options.arrayBufferError) {
        return Promise.reject(options.arrayBufferError);
      }
      return Promise.resolve(buffer);
    },
  };
}

function makeImpl(fn: (path: string) => Promise<StubResponse>): AssetFetchImpl {
  // Cast through unknown so we don't need a real DOM `Response`.
  return { fetch: fn as unknown as AssetFetchImpl['fetch'] };
}

function expectError(result: FetchAssetResult): result is { ok: false; status: number; error: string } {
  if (result.ok) {
    throw new Error(`expected error result, got ok=${String(result.ok)}`);
  }
  return true;
}

describe('fetchAssetHandler path validation', () => {
  // A fetch impl that always fails the test if invoked — validation
  // errors must short-circuit before any network work.
  const forbiddenFetch = makeImpl(() => {
    throw new Error('fetch should not be called for invalid paths');
  });

  it('rejects non-string path', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: 123 as unknown as string });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must be a non-empty string' });
  });

  it('rejects empty path', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: '' });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must be a non-empty string' });
  });

  it('rejects relative paths', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: 'systems/pf2e/foo.webp' });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must start with /' });
  });

  it('rejects paths with query strings', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: '/systems/pf2e/foo.webp?v=2' });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must not contain query or fragment' });
  });

  it('rejects paths with fragments', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: '/systems/pf2e/foo.webp#hash' });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must not contain query or fragment' });
  });

  it('rejects paths containing ..', async () => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: '/systems/../admin/config.json' });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path must not contain ..' });
  });

  it('rejects .. even when url-encoded context is not unwrapped', async () => {
    // We only guard against literal `..` — making sure that check
    // catches a trailing `..` too.
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path: '/systems/foo/..' });
    if (result.ok) {
      throw new Error('expected error result');
    }
    expect(result.error).toBe('path must not contain ..');
  });

  it.each([
    ['/admin/config.json'],
    ['/setup/backup'],
    ['/api/tokens'],
    ['/assets/index.html'],
    ['/foo/bar.webp'],
    ['/'],
  ])('rejects disallowed prefix %s', async (path) => {
    const handler = createFetchAssetHandler(forbiddenFetch);
    const result = await handler({ path });
    expectError(result);
    expect(result).toEqual({ ok: false, status: 400, error: 'path prefix not allowed' });
  });

  it.each([
    ['/icons/svg/mystery-man.svg'],
    ['/systems/pf2e/icons/iconics/portraits/amiri.webp'],
    ['/modules/my-module/assets/foo.png'],
    ['/worlds/my-world/tokens/goblin.png'],
    ['/ui/controls.svg'],
  ])('accepts whitelisted prefix %s', async (path) => {
    const impl = makeImpl((requested) => {
      expect(requested).toBe(path);
      return Promise.resolve(
        makeResponse({
          status: 200,
          body: new Uint8Array([1, 2, 3]),
          contentType: 'image/webp',
        }),
      );
    });
    const handler = createFetchAssetHandler(impl);
    const result = await handler({ path });
    expect(result.ok).toBe(true);
  });
});

describe('fetchAssetHandler success path', () => {
  it('returns base64 bytes and Content-Type from Foundry', async () => {
    const bodyBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const impl = makeImpl(() =>
      Promise.resolve(
        makeResponse({
          status: 200,
          body: bodyBytes,
          contentType: 'image/webp',
        }),
      ),
    );
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/systems/pf2e/icons/iconics/portraits/amiri.webp' });

    expect(result).toEqual({
      ok: true,
      contentType: 'image/webp',
      bytes: btoa('\xde\xad\xbe\xef'),
    });
  });

  it('falls back to application/octet-stream when Content-Type missing', async () => {
    const impl = makeImpl(() =>
      Promise.resolve(
        makeResponse({
          status: 200,
          body: new Uint8Array([42]),
          contentType: null,
        }),
      ),
    );
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/foo.svg' });

    if (result.ok) {
      expect(result.contentType).toBe('application/octet-stream');
    } else {
      throw new Error('expected ok result');
    }
  });

  it('encodes empty bodies as empty string', async () => {
    const impl = makeImpl(() =>
      Promise.resolve(
        makeResponse({
          status: 200,
          body: new Uint8Array([]),
          contentType: 'image/png',
        }),
      ),
    );
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/empty.png' });

    if (result.ok) {
      expect(result.bytes).toBe('');
    } else {
      throw new Error('expected ok result');
    }
  });

  it('handles bodies larger than the 32KB chunk boundary', async () => {
    // Cover the loop over chunkSize (0x8000) — regression guard for
    // any future refactor that swaps encodeBase64 out for a
    // spread-based version that would overflow the arg stack.
    const size = 0x8000 * 3 + 17;
    const body = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      body[i] = i & 0xff;
    }
    const impl = makeImpl(() =>
      Promise.resolve(makeResponse({ status: 200, body, contentType: 'application/octet-stream' })),
    );
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/large.bin' });

    if (!result.ok) {
      throw new Error(`expected ok, got ${result.error}`);
    }
    // Decode and compare to confirm round-trip fidelity across chunks.
    const decoded = atob(result.bytes);
    expect(decoded.length).toBe(size);
    for (let i = 0; i < size; i++) {
      expect(decoded.charCodeAt(i)).toBe(i & 0xff);
    }
  });
});

describe('fetchAssetHandler failure paths', () => {
  it('returns 404 when Foundry 404s', async () => {
    const impl = makeImpl(() => Promise.resolve(makeResponse({ status: 404 })));
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/systems/pf2e/icons/missing.webp' });

    expect(result).toEqual({ ok: false, status: 404, error: 'asset not found' });
  });

  it('returns 502 when Foundry returns non-404 error status', async () => {
    const impl = makeImpl(() => Promise.resolve(makeResponse({ status: 500 })));
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/foo.svg' });

    expect(result).toEqual({ ok: false, status: 502, error: 'upstream status 500' });
  });

  it('returns 502 when fetch throws', async () => {
    const impl = makeImpl(() => Promise.reject(new Error('ECONNREFUSED')));
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/foo.svg' });

    expect(result).toEqual({ ok: false, status: 502, error: 'fetch failed: ECONNREFUSED' });
  });

  it('returns 502 when arrayBuffer() rejects', async () => {
    const impl = makeImpl(() =>
      Promise.resolve(
        makeResponse({
          status: 200,
          contentType: 'image/webp',
          arrayBufferError: new Error('stream closed'),
        }),
      ),
    );
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/foo.svg' });

    expect(result).toEqual({ ok: false, status: 502, error: 'read failed: stream closed' });
  });

  it('wraps non-Error throws from fetch with String()', async () => {
    const impl = makeImpl(() => Promise.reject('network down'));
    const handler = createFetchAssetHandler(impl);

    const result = await handler({ path: '/icons/foo.svg' });

    expect(result).toEqual({ ok: false, status: 502, error: 'fetch failed: network down' });
  });
});

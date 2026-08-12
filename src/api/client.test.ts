import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, configureTokenStorage, queryString } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
  configureTokenStorage(() => ({}), () => undefined);
});

describe('queryString', () => {
  it('encodes values and omits undefined entries', () => {
    expect(queryString({ userId: 'a b', page: 2, empty: undefined })).toBe(
      '?userId=a+b&page=2',
    );
  });
});

describe('apiRequest', () => {
  it('adds bearer auth and serializes JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    configureTokenStorage(
      () => ({ accessToken: 'access', refreshToken: 'refresh' }),
      () => undefined,
    );

    await expect(
      apiRequest<{ ok: boolean }>('/test', {
        method: 'POST',
        body: { value: 1 },
      }),
    ).resolves.toEqual({ ok: true });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer access',
    );
    expect(init.body).toBe('{"value":1}');
  });

  it('normalizes unsuccessful responses into ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid code' }), {
          status: 400,
        }),
      ),
    );

    await expect(
      apiRequest('/test', { auth: false }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid code',
    });
  });
});

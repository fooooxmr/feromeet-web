import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, configureTokenStorage, queryString, API_BASE_URL } from './client';
import {
  belarusLocalDigits,
  formatBelarusPhoneMask,
  normalizeChatMessages,
  normalizePhone,
} from '../domain/models';

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

describe('normalizePhone', () => {
  it('sends E.164 like the Android client', () => {
    expect(normalizePhone('+375 29 123-45-67')).toBe('+375291234567');
    expect(normalizePhone('80291234567')).toBe('+375291234567');
    expect(normalizePhone('291234567')).toBe('+375291234567');
  });

  it('keeps Belarus-only local digits for the visual mask', () => {
    expect(belarusLocalDigits('+375 29 123-45-67')).toBe('291234567');
    expect(formatBelarusPhoneMask('291234567')).toBe('29 123 45 67');
    expect(formatBelarusPhoneMask('29')).toBe('29');
    expect(normalizePhone('29 123 45 67')).toBe('+375291234567');
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
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${API_BASE_URL}/test`);
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

  it('maps Feromeet errorCode to a readable message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: 'ERROR_USER_NOT_REGISTERED' }), {
          status: 400,
        }),
      ),
    );

    await expect(apiRequest('/test', { auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Аккаунт не найден. Проверьте номер или создайте аккаунт.',
    });
  });

  it('retries 401 after refreshing the access token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'next',
            refreshToken: 'refresh',
            registrationStatus: 'REGISTERED',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    configureTokenStorage(
      () => ({ accessToken: 'stale', refreshToken: 'refresh' }),
      () => undefined,
    );

    await expect(apiRequest<{ ok: boolean }>('/users')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not refresh or clear tokens on a 403', async () => {
    const writer = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Origin is not allowed', { status: 403 })),
    );
    configureTokenStorage(
      () => ({ accessToken: 'access', refreshToken: 'refresh' }),
      writer,
    );

    await expect(apiRequest('/users')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Не удалось загрузить данные. Попробуйте ещё раз.',
    });
    expect(writer).not.toHaveBeenCalled();
  });

  it('keeps the session when token refresh fails with 403', async () => {
    const writer = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(new Response('Origin is not allowed', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    configureTokenStorage(
      () => ({ accessToken: 'stale', refreshToken: 'refresh' }),
      writer,
    );

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 401 });
    expect(writer).not.toHaveBeenCalled();
  });

  it('clears tokens only when refresh returns a 401 auth error body', async () => {
    const writer = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errorCode: 'ERROR_INVALID_SMS_CODE', message: 'bad' }), {
          status: 401,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    configureTokenStorage(
      () => ({ accessToken: 'stale', refreshToken: 'refresh' }),
      writer,
    );

    await expect(apiRequest('/users')).rejects.toMatchObject({ status: 401 });
    expect(writer).toHaveBeenCalledWith(undefined);
  });
});

describe('normalizeChatMessages', () => {
  it('unwraps nested lists and sorts ChatMessageResponse fields', () => {
    const messages = normalizeChatMessages({
      data: {
        content: [
          {
            id: '2',
            senderId: 'user-a',
            recipientId: 'user-b',
            content: 'second',
            chatId: 'chat-1',
            createdAt: '2026-08-12T12:00:00Z',
            status: 'READ',
          },
          {
            id: '1',
            senderId: 'user-b',
            recipientId: 'user-a',
            content: 'first',
            chatId: 'chat-1',
            createdAt: '2026-08-12T11:00:00Z',
          },
        ],
      },
    });
    expect(messages.map((item) => item.content)).toEqual(['first', 'second']);
    expect(messages[0]).toMatchObject({
      id: '1',
      senderId: 'user-b',
      recipientId: 'user-a',
      chatId: 'chat-1',
    });
  });

  it('keeps a raw ChatMessageResponse array', () => {
    expect(
      normalizeChatMessages([
        {
          id: 'm1',
          senderId: 10,
          recipientId: 20,
          content: 'hello',
          chatId: 'c1',
          createdAt: '2026-08-12T10:00:00Z',
        },
      ]),
    ).toEqual([
      {
        id: 'm1',
        senderId: '10',
        recipientId: '20',
        content: 'hello',
        chatId: 'c1',
        createdAt: '2026-08-12T10:00:00Z',
        status: undefined,
      },
    ]);
  });
});

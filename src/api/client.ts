import type { ApiErrorBody, AuthTokens } from '../domain/models';

const ORIGIN_API_URL = 'https://feromeet.com';
const WEB_PROXY_URL = 'https://proxy-snowy-six-76.vercel.app/api/proxy';
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const isBrowser = typeof window !== 'undefined';

export const API_BASE_URL =
  configuredUrl || (isBrowser ? WEB_PROXY_URL : ORIGIN_API_URL);

type TokenReader = () => { accessToken?: string; refreshToken?: string };
type TokenWriter = (tokens?: AuthTokens) => void | Promise<void>;

let readTokens: TokenReader = () => ({});
let writeTokens: TokenWriter = () => undefined;
let refreshPromise: Promise<string | undefined> | undefined;

const AUTH_ERRORS: Record<string, string> = {
  ERROR_USER_NOT_REGISTERED: 'Аккаунт не найден. Проверьте номер или создайте аккаунт.',
  ERROR_USER_ALREADY_REGISTERED: 'Этот номер уже зарегистрирован. Войдите в аккаунт.',
  ERROR_RESEND_REQUESTED_BEFORE_60_SEC: 'Код уже отправлен. Новый можно запросить через 60 секунд.',
  ERROR_INVALID_SMS_CODE: 'Неверный код. Проверьте цифры и повторите.',
  ERROR_SMS_CODE_EXPIRED: 'Код устарел. Запросите новый.',
};

function errorMessage(body: ApiErrorBody | undefined, status: number) {
  const mapped = body?.errorCode ? AUTH_ERRORS[body.errorCode] : undefined;
  return mapped || body?.message || body?.error || `Request failed (${status})`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function configureTokenStorage(reader: TokenReader, writer: TokenWriter) {
  readTokens = reader;
  writeTokens = writer;
}

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | undefined;
    throw new ApiError(errorMessage(errorBody, response.status), response.status, errorBody);
  }

  return body as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function refreshAccessToken(): Promise<string | undefined> {
  const refreshToken = readTokens().refreshToken;
  if (!refreshToken) return undefined;

  if (!refreshPromise) {
    refreshPromise = fetch(apiUrl('/api/auth/refresh-access-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(parseResponse<AuthTokens>)
      .then(async (tokens) => {
        await writeTokens(tokens);
        return tokens.accessToken;
      })
      .catch(async () => {
        await writeTokens(undefined);
        return undefined;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }

  return refreshPromise;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, timeoutMs = 15_000, headers, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const accessToken = readTokens().accessToken;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (auth && accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: requestHeaders,
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 401 && auth) {
      const renewedToken = await refreshAccessToken();
      if (renewedToken) {
        requestHeaders.set('Authorization', `Bearer ${renewedToken}`);
        return apiRequest<T>(path, {
          ...options,
          headers: requestHeaders,
          auth: false,
        });
      }
    }

    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The server took too long to respond', 408);
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

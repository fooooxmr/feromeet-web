import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTREAM = 'https://feromeet.com';
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 90;

const routes = [
  /^api\/auth\/(?:login|registration)\/(?:request-sms|login-with-sms|register-with-sms)$/,
  /^api\/auth\/refresh-access-token$/,
  /^api\/auth\/registration\/save-profile$/,
  /^api\/user\/(?:get-all-users|get-by-id|get-search-preference|get-my-user|delete)$/,
  /^api\/user\/save\/(?:search-preference|height|text-about|ferotags|infotags|geo|photos)$/,
  /^api\/reaction\/(?:get-all-reactions|add-like|add-dislike|add-favorite|remove-favorite)$/,
  /^api\/meet\/(?:invite|get-active-meets|get-passed-meets|get-by-id|get-impression-tags|rate|hide|mark-as-read|cancel)$/,
  /^api\/meet\/stage[123]\/(?:accept-by-victim|consent-from-hunter|consent-from-victim|arrival-from-hunter|arrival-from-victim)$/,
  /^api\/meet\/api\/chat\/get-history$/,
  /^ws-chat\/info$/,
];

const buckets = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(origin: string | null) {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const defaults = ['https://fooooxmr.github.io'];
  const local = origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:');
  const allowed =
    !origin ||
    Boolean(local) ||
    defaults.includes(origin) ||
    configured.includes(origin);

  return {
    allowed,
    headers: {
      'Access-Control-Allow-Origin': allowed && origin ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isRateLimited(request: VercelRequest): boolean {
  const ip =
    headerValue(request.headers['x-real-ip']) ||
    headerValue(request.headers['x-forwarded-for'])?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

async function readBody(request: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  const origin = headerValue(request.headers.origin) ?? null;
  const cors = corsHeaders(origin);
  Object.entries(cors.headers).forEach(([key, value]) =>
    response.setHeader(key, value),
  );

  if (!cors.allowed) {
    response.status(403).send('Origin is not allowed');
    return;
  }
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  if (!request.method || !['GET', 'POST', 'DELETE'].includes(request.method)) {
    response.status(405).send('Method is not allowed');
    return;
  }
  if (isRateLimited(request)) {
    response.setHeader('Retry-After', '60');
    response.status(429).send('Too many requests');
    return;
  }

  const rawPath = request.query.upstream ?? request.query.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath ?? '';

  if (!routes.some((route) => route.test(path))) {
    response.status(404).send('Route is not allowed');
    return;
  }

  const contentLength = Number(headerValue(request.headers['content-length']) || 0);
  if (contentLength > MAX_BODY_BYTES) {
    response.status(413).send('Request body is too large');
    return;
  }

  const headers = new Headers();
  const authorization = headerValue(request.headers.authorization);
  const contentType = headerValue(request.headers['content-type']);
  if (authorization) headers.set('Authorization', authorization);
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Accept', 'application/json');

  try {
    const requestUrl = new URL(request.url || '/', `https://${request.headers.host}`);
    const body =
      request.method === 'GET' || request.method === 'DELETE'
        ? undefined
        : await readBody(request);
    const upstream = await fetch(`${UPSTREAM}/${path}${requestUrl.search}`, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) response.setHeader('Content-Type', upstreamType);
    response.setHeader('Cache-Control', 'no-store');
    response.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') {
      response.status(413).send('Request body is too large');
      return;
    }
    response.status(502).json({
      message: 'Feromeet API is temporarily unavailable',
    });
  }
}

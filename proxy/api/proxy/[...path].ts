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
  const local = origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:');
  const allowed = !origin || local || configured.includes(origin);

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

function isRateLimited(request: Request): boolean {
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
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

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);

  if (!cors.allowed) {
    return new Response('Origin is not allowed', { status: 403 });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers });
  }
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    return new Response('Method is not allowed', {
      status: 405,
      headers: cors.headers,
    });
  }
  if (isRateLimited(request)) {
    return new Response('Too many requests', {
      status: 429,
      headers: { ...cors.headers, 'Retry-After': '60' },
    });
  }

  const url = new URL(request.url);
  const marker = '/api/proxy/';
  const markerIndex = url.pathname.indexOf(marker);
  const path =
    markerIndex >= 0 ? decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) : '';

  if (!routes.some((route) => route.test(path))) {
    return new Response('Route is not allowed', {
      status: 404,
      headers: cors.headers,
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response('Request body is too large', {
      status: 413,
      headers: cors.headers,
    });
  }

  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  if (authorization) headers.set('Authorization', authorization);
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Accept', 'application/json');

  try {
    const upstream = await fetch(`${UPSTREAM}/${path}${url.search}`, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'DELETE'
          ? undefined
          : await request.arrayBuffer(),
      redirect: 'manual',
    });
    const responseHeaders = new Headers(cors.headers);
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) responseHeaders.set('Content-Type', upstreamType);
    responseHeaders.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: 'Feromeet API is temporarily unavailable' },
      { status: 502, headers: cors.headers },
    );
  }
}

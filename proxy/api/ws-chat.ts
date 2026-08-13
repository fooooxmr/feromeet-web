import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

const UPSTREAM = 'wss://feromeet.com/ws-chat';
const SOCKJS_PATH =
  /(?:^|\/)(?:api\/)?ws-chat\/(\d{3})\/([A-Za-z0-9]{8})\/websocket\/?$|^(\d{3})\/([A-Za-z0-9]{8})\/websocket\/?$/;

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function allowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === 'https://fooooxmr.github.io' ||
    configured.includes(origin)
  );
}

function matchSockJs(path: string) {
  const match = SOCKJS_PATH.exec(path);
  if (!match) return undefined;
  return {
    serverId: match[1] || match[3],
    session: match[2] || match[4],
  };
}

function sockJsTarget(request: http.IncomingMessage) {
  const host = headerValue(request.headers.host) || 'localhost';
  const url = new URL(request.url || '/', `https://${host}`);
  const candidates = [
    request.url,
    url.pathname,
    url.searchParams.get('upstream'),
    headerValue(request.headers['x-forwarded-uri']),
    headerValue(request.headers['x-invoke-path']),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const path = raw.startsWith('http')
      ? new URL(raw).pathname
      : raw.startsWith('/')
        ? new URL(raw, `https://${host}`).pathname
        : raw;
    const target = matchSockJs(path);
    if (target) return target;
  }
  return undefined;
}

function accessTokenFromRequest(request: http.IncomingMessage) {
  const host = headerValue(request.headers.host) || 'localhost';
  const url = new URL(request.url || '/', `https://${host}`);
  const fromQuery = url.searchParams.get('access_token');
  if (fromQuery) return fromQuery;
  const forwarded = headerValue(request.headers['x-forwarded-uri']);
  if (forwarded) {
    try {
      const token = new URL(forwarded, `https://${host}`).searchParams.get('access_token');
      if (token) return token;
    } catch {
      /* ignore */
    }
  }
  const protocols = (headerValue(request.headers['sec-websocket-protocol']) || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value && value !== 'feromeet.v1');
  return protocols[0];
}

function reject(socket: { write: (chunk: string) => void; destroy: () => void }, status: string) {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function pipe(from: WebSocket, to: WebSocket) {
  from.on('message', (data, isBinary) => {
    if (to.readyState === WebSocket.OPEN) to.send(data, { binary: isBinary });
  });
}

const server = http.createServer((_request, response) => {
  response.writeHead(426, { 'Content-Type': 'text/plain' });
  response.end('Expected WebSocket upgrade');
});

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) =>
    [...protocols].includes('feromeet.v1') ? 'feromeet.v1' : false,
});

server.on('upgrade', (request, socket, head) => {
  const origin = headerValue(request.headers.origin);
  if (!allowedOrigin(origin)) {
    reject(socket, '403 Forbidden');
    return;
  }
  const target = sockJsTarget(request);
  if (!target) {
    reject(socket, '404 Not Found');
    return;
  }

  const accessToken = accessTokenFromRequest(request);

  wss.handleUpgrade(request, socket, head, (client) => {
    const headers: Record<string, string> = { 'User-Agent': 'okhttp/4.12.0' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const upstream = new WebSocket(
      `${UPSTREAM}/${target.serverId}/${target.session}/websocket`,
      { headers },
    );

    const pending: Array<{ data: WebSocket.RawData; binary: boolean }> = [];
    let closed = false;

    const closeBoth = () => {
      if (closed) return;
      closed = true;
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close();
      }
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
        upstream.close();
      }
    };

    pipe(upstream, client);
    client.on('message', (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data, { binary: isBinary });
        return;
      }
      pending.push({ data, binary: isBinary });
    });
    client.on('close', closeBoth);
    client.on('error', closeBoth);

    upstream.on('open', () => {
      pending.splice(0).forEach((item) => {
        if (upstream.readyState === WebSocket.OPEN) {
          upstream.send(item.data, { binary: item.binary });
        }
      });
    });
    upstream.on('close', closeBoth);
    upstream.on('error', closeBoth);
  });
});

export default server;

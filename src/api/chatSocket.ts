import { API_BASE_URL, apiRequest } from './client';
import { normalizeChatMessage, type ChatMessage } from '../domain/models';

type SocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ChatSocketCallbacks {
  onMessage?: (message: ChatMessage) => void;
  onStatus?: (payload: unknown) => void;
  onTyping?: (payload: unknown) => void;
  onState?: (state: SocketState) => void;
  onError?: (error: Error) => void;
}

interface Subscription {
  id: string;
  destination: string;
  callback: (body: string) => void;
}

interface QueuedSend {
  destination: string;
  body: string;
}

export function resolveChatWsBase(options?: {
  apiBaseUrl?: string;
  envWsUrl?: string;
  browser?: boolean;
}): string {
  const apiBaseUrl = options?.apiBaseUrl ?? API_BASE_URL;
  const envWsUrl = options?.envWsUrl ?? process.env.EXPO_PUBLIC_WS_URL;
  const browser = options?.browser ?? typeof window !== 'undefined';
  const configured = envWsUrl?.replace(/\/$/, '');
  if (!browser) {
    return configured || 'wss://feromeet.com/ws-chat';
  }
  try {
    const api = new URL(apiBaseUrl);
    return `${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}/api/ws-chat`;
  } catch {
    return 'wss://feromeet.com/ws-chat';
  }
}

function log(event: string, extra?: Record<string, unknown>) {
  console.info('[feromeet] chat socket', event, extra ?? '');
}

function sessionId(): string {
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('');
}

function safePayload(body: string): unknown {
  try {
    return JSON.parse(body.replace(/\u0000$/, '').trim());
  } catch {
    return body.replace(/\u0000$/, '');
  }
}

function sockJsFrames(payload: string): string[] {
  const trimmed = payload.trim();
  if (trimmed === 'o' || trimmed === 'h' || trimmed.startsWith('c[')) return [];
  try {
    if (trimmed.startsWith('a')) {
      const start = trimmed.indexOf('[');
      const end = trimmed.lastIndexOf(']');
      if (start >= 0 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1)) as string[];
      }
    }
    if (trimmed.startsWith('[')) return JSON.parse(trimmed) as string[];
  } catch {
    return [payload];
  }
  return [payload];
}

function encodeSockJs(frame: string) {
  return `["${frame
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\u0000/g, '\\u0000')}"]`;
}

async function asText(data: unknown): Promise<string> {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (typeof Blob !== 'undefined' && data instanceof Blob) return data.text();
  return String(data ?? '');
}

export class FeromeetChatSocket {
  private socket?: WebSocket;
  private subscriptions: Subscription[] = [];
  private nextSubscriptionId = 1;
  private connected = false;
  private closedByUser = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private attempts = 0;
  private generation = 0;
  private outboundQueue: QueuedSend[] = [];
  private pendingReadId?: string;

  constructor(
    private readonly accessToken: string,
    private readonly chatId: string,
    private readonly callbacks: ChatSocketCallbacks = {},
  ) {}

  get isConnected() {
    return this.connected;
  }

  async connect() {
    if (this.closedByUser) return;
    const generation = ++this.generation;
    this.clearReconnect();
    this.teardownSocket();
    this.callbacks.onState?.('connecting');
    try {
      const wsBase = resolveChatWsBase();
      let serverId = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      try {
        const info = await apiRequest<{ entropy?: number }>('/ws-chat/info');
        if (info?.entropy != null) {
          serverId = String(Math.abs(info.entropy % 1000)).padStart(3, '0');
        }
      } catch {
        /* SockJS info is optional; still open the websocket. */
      }
      if (this.closedByUser || generation !== this.generation) return;
      const url = `${wsBase}/${serverId}/${sessionId()}/websocket`;
      log('connect', { url });
      this.socket = new WebSocket(url);
      this.socket.onopen = () => log('open', { url });
      this.socket.onmessage = ({ data }) => {
        void asText(data).then((text) => this.handleSockJs(text));
      };
      this.socket.onerror = () => {
        const error = new Error('Realtime chat connection failed');
        log('error', { url });
        this.callbacks.onState?.('error');
        this.callbacks.onError?.(error);
      };
      this.socket.onclose = () => {
        this.connected = false;
        this.stopHeartbeat();
        log('close', { url });
        this.callbacks.onState?.('disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      this.callbacks.onState?.('error');
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error('Realtime chat failed'),
      );
      this.scheduleReconnect();
    }
  }

  private handleSockJs(payload: string) {
    if (payload.trim() === 'o') {
      this.sendFrame(
        `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\nAuthorization:Bearer ${this.accessToken}\n\n\u0000`,
      );
      return;
    }
    sockJsFrames(payload).forEach((frame) => this.handleStompFrame(frame));
  }

  private handleStompFrame(frame: string) {
    const normalized = frame
      .replaceAll('\\n', '\n')
      .replaceAll('\\u0000', '\u0000')
      .replaceAll('\r', '');
    const [headerBlock, ...bodyParts] = normalized.split('\n\n');
    const headerLines = headerBlock?.split('\n') || [];
    const command = (headerLines.shift() || '').trim();
    const headers = Object.fromEntries(
      headerLines.map((line) => {
        const separator = line.indexOf(':');
        return separator >= 0
          ? [line.slice(0, separator), line.slice(separator + 1)]
          : [line, ''];
      }),
    );

    if (command === 'CONNECTED') {
      this.connected = true;
      this.attempts = 0;
      log('connected');
      this.callbacks.onState?.('connected');
      this.startHeartbeat();
      this.subscribe(
        `/user/queue/chat.${this.chatId}.messages`,
        (body) => {
          const message = normalizeChatMessage(safePayload(body));
          if (message) this.callbacks.onMessage?.(message);
        },
      );
      this.subscribe(
        `/user/queue/chat.${this.chatId}.message-status`,
        (body) => this.callbacks.onStatus?.(safePayload(body)),
      );
      this.subscribe(
        `/user/queue/chat.${this.chatId}.typing-status`,
        (body) => this.callbacks.onTyping?.(safePayload(body)),
      );
      this.flushOutbound();
      return;
    }

    if (command === 'ERROR') {
      this.connected = false;
      log('stomp-error');
      this.callbacks.onState?.('error');
      this.callbacks.onError?.(
        new Error(bodyParts.join('\n\n').replace(/\u0000$/, '') || 'STOMP error'),
      );
      this.socket?.close(1000, 'STOMP Error');
      return;
    }

    if (command === 'MESSAGE') {
      const subscription = this.subscriptions.find(
        (item) =>
          item.id === headers.subscription ||
          item.destination === headers.destination,
      );
      subscription?.callback(bodyParts.join('\n\n'));
    }
  }

  private subscribe(destination: string, callback: (body: string) => void) {
    const id = String(this.nextSubscriptionId++);
    this.subscriptions.push({ id, destination, callback });
    this.sendFrame(`SUBSCRIBE\nid:${id}\ndestination:${destination}\n\n\u0000`);
  }

  private sendFrame(frame: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(encodeSockJs(frame));
    }
  }

  private sendStomp(destination: string, body: string) {
    this.sendFrame(
      `SEND\ndestination:${destination}\ncontent-type:application/json\n\n${body}\u0000`,
    );
  }

  private enqueueOrSend(destination: string, body: string) {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
      this.sendStomp(destination, body);
      log('send', { destination });
      return true;
    }
    this.outboundQueue.push({ destination, body });
    return false;
  }

  private flushOutbound() {
    const queued = this.outboundQueue;
    this.outboundQueue = [];
    queued.forEach((item) => {
      this.sendStomp(item.destination, item.body);
      log('send', { destination: item.destination });
    });
    if (this.pendingReadId) {
      const lastReadMessageId = this.pendingReadId;
      this.pendingReadId = undefined;
      this.sendStomp(
        '/app/chat/read',
        JSON.stringify({ chatId: this.chatId, lastReadMessageId }),
      );
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(encodeSockJs('\n'));
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  private scheduleReconnect() {
    if (this.closedByUser || this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.attempts, 15000);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private teardownSocket() {
    this.stopHeartbeat();
    this.connected = false;
    this.subscriptions = [];
    this.nextSubscriptionId = 1;
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close(1000, 'Normal closure');
      }
      this.socket = undefined;
    }
  }

  sendMessage(recipientId: string, content: string) {
    if (!recipientId || !content) return false;
    return this.enqueueOrSend(
      '/app/chat/send',
      JSON.stringify({ recipientId, content, chatId: this.chatId }),
    );
  }

  sendTyping(recipientId: string, isTyping: boolean) {
    if (!this.connected || !recipientId) return;
    this.sendStomp(
      '/app/chat/typing',
      JSON.stringify({ recipientId, isTyping, chatId: this.chatId }),
    );
  }

  markRead(lastReadMessageId: string) {
    if (!lastReadMessageId || lastReadMessageId.startsWith('local-')) return;
    if (!this.connected) {
      this.pendingReadId = lastReadMessageId;
      return;
    }
    this.sendStomp(
      '/app/chat/read',
      JSON.stringify({ chatId: this.chatId, lastReadMessageId }),
    );
  }

  disconnect() {
    this.closedByUser = true;
    this.generation += 1;
    this.clearReconnect();
    this.outboundQueue = [];
    this.pendingReadId = undefined;
    if (this.connected) this.sendFrame('DISCONNECT\n\n\u0000');
    this.teardownSocket();
  }
}

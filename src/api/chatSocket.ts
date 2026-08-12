import { apiRequest } from './client';
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
    return JSON.parse(body.replace(/\u0000$/, ''));
  } catch {
    return body.replace(/\u0000$/, '');
  }
}

export class FeromeetChatSocket {
  private socket?: WebSocket;
  private subscriptions: Subscription[] = [];
  private nextSubscriptionId = 1;
  private connected = false;

  constructor(
    private readonly accessToken: string,
    private readonly chatId: string,
    private readonly callbacks: ChatSocketCallbacks = {},
  ) {}

  async connect() {
    this.callbacks.onState?.('connecting');
    try {
      const wsBase =
        process.env.EXPO_PUBLIC_WS_URL?.replace(/\/$/, '') || 'wss://feromeet.com/ws-chat';
      const info = await apiRequest<{ entropy?: number }>('/ws-chat/info');
      const serverId = String(
        Math.abs((info.entropy || Date.now()) % 1000),
      ).padStart(3, '0');
      const url = `${wsBase}/${serverId}/${sessionId()}/websocket`;
      this.socket = new WebSocket(url);
      this.socket.onmessage = ({ data }) => this.handleSockJs(String(data));
      this.socket.onerror = () => {
        const error = new Error('Realtime chat connection failed');
        this.callbacks.onState?.('error');
        this.callbacks.onError?.(error);
      };
      this.socket.onclose = () => {
        this.connected = false;
        this.callbacks.onState?.('disconnected');
      };
    } catch (error) {
      this.callbacks.onState?.('error');
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error('Realtime chat failed'),
      );
    }
  }

  private handleSockJs(payload: string) {
    if (payload === 'o') {
      this.sendFrame(
        `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\nAuthorization:Bearer ${this.accessToken}\n\n\u0000`,
      );
      return;
    }
    if (payload === 'h' || payload.startsWith('c[')) return;

    const frames: string[] = payload.startsWith('a[')
      ? (JSON.parse(payload.slice(1)) as string[])
      : [payload];
    frames.forEach((frame) => this.handleStompFrame(frame));
  }

  private handleStompFrame(frame: string) {
    const normalized = frame
      .replaceAll('\\n', '\n')
      .replaceAll('\\u0000', '\u0000');
    const [headerBlock, ...bodyParts] = normalized.split('\n\n');
    const headerLines = headerBlock?.split('\n') || [];
    const command = headerLines.shift();
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
      this.callbacks.onState?.('connected');
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
      this.socket.send(JSON.stringify([frame]));
    }
  }

  sendMessage(recipientId: string, content: string) {
    if (!this.connected) return false;
    this.sendFrame(
      `SEND\ndestination:/app/chat/send\ncontent-type:application/json\n\n${JSON.stringify(
        { recipientId, content, chatId: this.chatId },
      )}\u0000`,
    );
    return true;
  }

  sendTyping(recipientId: string, isTyping: boolean) {
    if (!this.connected) return;
    this.sendFrame(
      `SEND\ndestination:/app/chat/typing\ncontent-type:application/json\n\n${JSON.stringify(
        { recipientId, isTyping, chatId: this.chatId },
      )}\u0000`,
    );
  }

  markRead(lastReadMessageId: string) {
    if (!this.connected) return;
    this.sendFrame(
      `SEND\ndestination:/app/chat/read\ncontent-type:application/json\n\n${JSON.stringify(
        { chatId: this.chatId, lastReadMessageId },
      )}\u0000`,
    );
  }

  disconnect() {
    if (this.connected) this.sendFrame('DISCONNECT\n\n\u0000');
    this.socket?.close(1000, 'Normal closure');
    this.connected = false;
    this.subscriptions = [];
  }
}

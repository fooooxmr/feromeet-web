import { describe, expect, it } from 'vitest';
import { FeromeetChatSocket, resolveChatWsBase } from './chatSocket';

describe('resolveChatWsBase', () => {
  it('opens native SockJS websocket on feromeet.com outside the browser', () => {
    expect(
      resolveChatWsBase({
        browser: false,
        envWsUrl: undefined,
        apiBaseUrl: 'https://proxy-snowy-six-76.vercel.app/api/proxy',
      }),
    ).toBe('wss://feromeet.com/ws-chat');
  });

  it('uses the Vercel WS bridge from GitHub Pages so Origin is not feromeet.com CORS', () => {
    expect(
      resolveChatWsBase({
        browser: true,
        envWsUrl: 'wss://feromeet.com/ws-chat',
        apiBaseUrl: 'https://proxy-snowy-six-76.vercel.app/api/proxy',
      }),
    ).toBe('wss://proxy-snowy-six-76.vercel.app/api/ws-chat');
  });
});

describe('FeromeetChatSocket', () => {
  it('does not claim a send succeeded before STOMP CONNECTED', () => {
    const socket = new FeromeetChatSocket('token', 'chat-1');
    expect(socket.sendMessage('peer-1', 'Здарова')).toBe(false);
  });
});

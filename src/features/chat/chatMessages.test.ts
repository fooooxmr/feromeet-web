import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../domain/models';
import {
  applyMessageStatus,
  lastIncomingId,
  outgoingReceiptMark,
  peerIdFromMessages,
  upsertChatMessage,
} from './chatMessages';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: '1',
  senderId: 'me',
  recipientId: 'peer',
  content: 'hi',
  chatId: 'c1',
  createdAt: '2026-08-13T10:00:00Z',
  ...overrides,
});

describe('chat message helpers', () => {
  it('resolves the other party from history like Android temp_recipient fallback', () => {
    expect(
      peerIdFromMessages(
        [message({ senderId: 'me', recipientId: 'peer' }), message({ id: '2', senderId: 'peer', recipientId: 'me' })],
        'me',
      ),
    ).toBe('peer');
  });

  it('replaces a local optimistic bubble with the STOMP echo', () => {
    const next = upsertChatMessage(
      [message({ id: 'local-1', content: 'hello', status: 'SENDING' })],
      message({ id: 'srv-1', content: 'hello', status: 'DELIVERED' }),
    );
    expect(next).toEqual([message({ id: 'srv-1', content: 'hello', status: 'DELIVERED' })]);
  });

  it('applies { id, status } from /user/queue/chat.{id}.message-status', () => {
    const next = applyMessageStatus(
      [message({ id: 'srv-1', status: 'DELIVERED' })],
      { id: 'srv-1', status: 'READ' },
      'me',
    );
    expect(next[0]?.status).toBe('READ');
  });

  it('marks outgoing messages through lastReadMessageId as READ', () => {
    const next = applyMessageStatus(
      [
        message({ id: 'a', status: 'DELIVERED' }),
        message({ id: 'b', senderId: 'peer', recipientId: 'me', status: 'DELIVERED' }),
        message({ id: 'c', status: 'DELIVERED' }),
      ],
      { chatId: 'c1', lastReadMessageId: 'a' },
      'me',
    );
    expect(next.map((item) => item.status)).toEqual(['READ', 'DELIVERED', 'DELIVERED']);
  });

  it('shows Android-style single/double ticks only after the server acks', () => {
    expect(outgoingReceiptMark(undefined)).toBe('');
    expect(outgoingReceiptMark('PENDING')).toBe('');
    expect(outgoingReceiptMark('SENDING')).toBe('');
    expect(outgoingReceiptMark('DELIVERED')).toBe('  ✓');
    expect(outgoingReceiptMark('READ')).toBe('  ✓✓');
  });

  it('finds the last incoming message for /app/chat/read', () => {
    expect(
      lastIncomingId(
        [
          message({ id: 'a', senderId: 'peer', recipientId: 'me' }),
          message({ id: 'b' }),
          message({ id: 'c', senderId: 'peer', recipientId: 'me' }),
        ],
        'me',
      ),
    ).toBe('c');
  });
});

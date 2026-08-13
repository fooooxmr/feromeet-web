import type { ChatMessage } from '../../domain/models';

export function peerIdFromMessages(messages: ChatMessage[], ownId: string): string {
  if (!ownId) return '';
  for (const message of messages) {
    if (message.senderId && String(message.senderId) !== String(ownId)) {
      return String(message.senderId);
    }
    if (message.recipientId && String(message.recipientId) !== String(ownId)) {
      return String(message.recipientId);
    }
  }
  return '';
}

export function upsertChatMessage(current: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (current.some((item) => item.id === incoming.id)) {
    return current.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item));
  }
  const localIndex = current.findIndex(
    (item) =>
      item.id.startsWith('local-') &&
      item.content === incoming.content &&
      String(item.senderId) === String(incoming.senderId),
  );
  if (localIndex >= 0) {
    const next = [...current];
    next[localIndex] = incoming;
    return next;
  }
  return [...current, incoming];
}

export function applyMessageStatus(
  current: ChatMessage[],
  payload: unknown,
  ownId: string,
): ChatMessage[] {
  if (!payload || typeof payload !== 'object') return current;
  const record = payload as Record<string, unknown>;
  const nested =
    record.message && typeof record.message === 'object'
      ? (record.message as Record<string, unknown>)
      : record;
  const status = nested.status != null ? String(nested.status).toUpperCase() : '';
  const id = nested.id != null && String(nested.id) !== '' ? String(nested.id) : '';
  const lastReadMessageId =
    nested.lastReadMessageId != null && String(nested.lastReadMessageId) !== ''
      ? String(nested.lastReadMessageId)
      : '';

  if (id && status) {
    const nextStatus = status === 'READ' ? 'READ' : 'DELIVERED';
    return current.map((item) => (item.id === id ? { ...item, status: nextStatus } : item));
  }

  const readThrough = lastReadMessageId || (status === 'READ' ? id : '');
  if (!readThrough) return current;
  const index = current.findIndex((item) => item.id === readThrough);
  return current.map((item, itemIndex) => {
    if (!ownId || String(item.senderId) !== String(ownId) || item.id.startsWith('local-')) {
      return item;
    }
    if (index >= 0 ? itemIndex <= index : item.id === readThrough) {
      return { ...item, status: 'READ' };
    }
    return item;
  });
}

export function lastIncomingId(messages: ChatMessage[], ownId: string): string | undefined {
  if (!ownId) return undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message &&
      !message.id.startsWith('local-') &&
      String(message.senderId) !== String(ownId)
    ) {
      return message.id;
    }
  }
  return undefined;
}

export function outgoingReceiptMark(status?: string): string {
  if (!status) return '';
  const value = status.toUpperCase();
  if (value === 'READ') return '  ✓✓';
  if (value === 'DELIVERED') return '  ✓';
  if (value === 'FAILED') return '  !';
  if (value === 'PENDING' || value === 'SENDING') return '  …';
  return '';
}

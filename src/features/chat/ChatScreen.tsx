import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  formatLastSeen,
  isUserOnline,
  photoUrl,
  type ChatMessage,
  type FeromeetUser,
} from '../../domain/models';
import { messages as initialMessages } from '../demo/fixtures';
import { Avatar, ScreenState } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/tokens';
import { ApiError } from '../../api/client';
import { chatApi, meetsApi, profileApi } from '../../api/endpoints';
import { FeromeetChatSocket } from '../../api/chatSocket';
import { useSessionStore } from '../../state/session';
import {
  applyMessageStatus,
  lastIncomingId,
  outgoingReceiptMark,
  peerIdFromMessages,
  upsertChatMessage,
} from './chatMessages';

function asChatId(value: string | string[] | undefined) {
  const chatId = Array.isArray(value) ? value[0] : value;
  return chatId?.trim() || undefined;
}

function typingActive(payload: unknown): boolean {
  if (typeof payload === 'boolean') return payload;
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return Boolean(record.isTyping ?? record.typing);
}

function profileId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  if (record.id != null && record.id !== '') return String(record.id);
  for (const key of ['data', 'user', 'result'] as const) {
    const nested = profileId(record[key]);
    if (nested) return nested;
  }
  return undefined;
}

export function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = asChatId(id);
  const accessToken = useSessionStore((state) => state.accessToken);
  const demoMode = useSessionStore((state) => state.demoMode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState(demoMode ? 'me' : '');
  const [recipientId, setRecipientId] = useState(demoMode ? 'lena' : '');
  const [peerName, setPeerName] = useState(demoMode ? 'Лена' : 'Собеседник');
  const [peerPhoto, setPeerPhoto] = useState<string>();
  const [peerUserId, setPeerUserId] = useState(demoMode ? 'lena' : '');
  const [peerLastSeen, setPeerLastSeen] = useState<string | undefined>();
  const [meetId, setMeetId] = useState<number>();
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [historyError, setHistoryError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [socketState, setSocketState] = useState<'preview' | 'connecting' | 'connected' | 'offline'>(
    demoMode ? 'preview' : 'offline',
  );
  const socketRef = useRef<FeromeetChatSocket | undefined>(undefined);
  const listRef = useRef<ScrollView>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typingSent = useRef(false);
  const recipientIdRef = useRef(recipientId);
  const currentUserIdRef = useRef(currentUserId);
  const messagesRef = useRef(messages);
  const pendingSends = useRef<string[]>([]);
  recipientIdRef.current = recipientId;
  currentUserIdRef.current = currentUserId;
  messagesRef.current = messages;

  const rememberPeer = (peer?: string) => {
    const id = peer?.trim();
    if (!id) return;
    recipientIdRef.current = id;
    setRecipientId(id);
    setPeerUserId((current) => current || id);
  };

  const markIncomingRead = (list: ChatMessage[]) => {
    const lastId = lastIncomingId(list, currentUserIdRef.current);
    if (lastId) socketRef.current?.markRead(lastId);
  };

  const flushPendingSends = () => {
    const peer = recipientIdRef.current;
    const socket = socketRef.current;
    if (!peer || !socket) return;
    const waiting = pendingSends.current;
    pendingSends.current = [];
    waiting.forEach((content) => socket.sendMessage(peer, content));
  };

  useEffect(() => {
    if (!chatId || !hydrated) return;
    let active = true;
    if (demoMode) {
      setMessages(initialMessages);
      setLoading(false);
      setHistoryError('');
      setSocketState('connected');
      return () => {
        active = false;
      };
    }
    if (!accessToken) return;

    setLoading(true);
    setHistoryError('');
    setMessages([]);

    void (async () => {
      const [profile, activeMeets, passedMeets] = await Promise.all([
        profileApi.getMyProfile().catch(() => undefined),
        meetsApi.getActive().catch(() => []),
        meetsApi.getPassed().catch(() => []),
      ]);
      if (!active) return;
      const ownId = profileId(profile);
      if (ownId) {
        currentUserIdRef.current = ownId;
        setCurrentUserId(ownId);
      }
      const meet = [...activeMeets, ...passedMeets].find(
        (item) =>
          String(item.chatId) === String(chatId) || String(item.meetId) === String(chatId),
      );
      const resolvedChatId = meet?.chatId || chatId;
      if (meet?.user) {
        const user = meet.user as FeromeetUser;
        const peer = user.id != null && String(user.id).trim() ? String(user.id) : '';
        setPeerName(user.name);
        setMeetId(meet.meetId);
        rememberPeer(peer);
        setPeerPhoto(photoUrl(user.mainSmallPhotoFilename || user.mainPhotoFilename));
        setPeerLastSeen(user.lastSeen || meet.lastSeen);
        void meetsApi.markAsRead(meet.meetId).catch(() => undefined);
      }

      setSocketState('connecting');
      const socket = new FeromeetChatSocket(accessToken, resolvedChatId, {
        onMessage: (message) => {
          if (!active) return;
          setMessages((current) => {
            const next = upsertChatMessage(current, message);
            messagesRef.current = next;
            return next;
          });
          const own = currentUserIdRef.current;
          if (own && String(message.senderId) !== String(own)) {
            socket.markRead(message.id);
          }
        },
        onStatus: (payload) => {
          if (!active) return;
          setMessages((current) => {
            const next = applyMessageStatus(current, payload, currentUserIdRef.current);
            messagesRef.current = next;
            return next;
          });
        },
        onTyping: (payload) => {
          if (active) setTyping(typingActive(payload));
        },
        onState: (state) => {
          if (!active) return;
          setSocketState(
            state === 'connected'
              ? 'connected'
              : state === 'connecting'
                ? 'connecting'
                : 'offline',
          );
          if (state === 'connected') {
            markIncomingRead(messagesRef.current);
            flushPendingSends();
          }
        },
      });
      socketRef.current = socket;
      void socket.connect();

      try {
        const history = await chatApi.getHistory(resolvedChatId);
        if (!active) return;
        rememberPeer(peerIdFromMessages(history, currentUserIdRef.current));
        setMessages((current) => {
          const merged = [...history];
          current.forEach((item) => {
            if (!merged.some((message) => message.id === item.id)) merged.push(item);
          });
          const next = merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          messagesRef.current = next;
          return next;
        });
        markIncomingRead(history);
        flushPendingSends();
        setHistoryError('');
      } catch (error) {
        if (!active) return;
        const status = error instanceof ApiError ? error.status : 0;
        setHistoryError(
          status === 403 || status === 401
            ? 'Не удалось загрузить переписку. Попробуйте ещё раз.'
            : error instanceof ApiError
              ? error.message
              : 'Не удалось загрузить переписку',
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socketRef.current?.disconnect();
      socketRef.current = undefined;
    };
  }, [accessToken, chatId, demoMode, hydrated, reloadKey]);

  useEffect(() => {
    if (recipientId && socketState === 'connected') flushPendingSends();
  }, [recipientId, socketState]);

  const reportTyping = (active: boolean) => {
    const peer = recipientIdRef.current;
    if (!peer) return;
    if (active) {
      if (!typingSent.current) {
        socketRef.current?.sendTyping(peer, true);
        typingSent.current = true;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.sendTyping(peer, false);
        typingSent.current = false;
      }, 2000);
      return;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (typingSent.current) socketRef.current?.sendTyping(peer, false);
    typingSent.current = false;
  };

  const send = () => {
    const content = draft.trim();
    if (!content || !chatId) return;
    const peer =
      recipientIdRef.current ||
      peerIdFromMessages(messagesRef.current, currentUserIdRef.current);
    if (peer) rememberPeer(peer);
    let sent = false;
    if (peer) {
      sent = socketRef.current?.sendMessage(peer, content) ?? false;
      if (!sent) pendingSends.current.push(content);
    } else {
      pendingSends.current.push(content);
    }
    setMessages((current) => {
      const next = [
        ...current,
        {
          id: `local-${Date.now()}`,
          senderId: currentUserIdRef.current,
          recipientId: peer,
          chatId,
          content,
          createdAt: new Date().toISOString(),
          status: sent || peer ? 'SENDING' : 'PREVIEW',
        },
      ];
      messagesRef.current = next;
      return next;
    });
    setDraft('');
    reportTyping(false);
  };

  const presenceText = typing
    ? `${peerName} печатает…`
    : socketState === 'connected'
      ? isUserOnline(peerLastSeen)
        ? '● онлайн'
        : formatLastSeen(peerLastSeen) || '● онлайн'
      : formatLastSeen(peerLastSeen) || 'напишите сообщение';
  const presenceOnline = typing
    ? false
    : socketState === 'connected' && isUserOnline(peerLastSeen);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={peerName}
          disabled={!peerUserId}
          onPress={() => peerUserId && router.push(`/profile/${peerUserId}`)}
        >
          <Avatar name={peerName} size={44} uri={peerPhoto} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{peerName}</Text>
          <Text style={presenceOnline ? styles.online : styles.preview}>{presenceText}</Text>
        </View>
        <Pressable
          onPress={() => router.push(meetId ? `/meet/${meetId}` : '/meets')}
          style={styles.planButton}
        >
          <Text style={styles.planText}>План встречи</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={listRef}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((message, index) => {
          const mine = Boolean(currentUserId) && String(message.senderId) === String(currentUserId);
          const previous = messages[index - 1];
          const day = new Date(message.createdAt).toDateString();
          const showDay = !previous || new Date(previous.createdAt).toDateString() !== day;
          const label =
            day === new Date().toDateString()
              ? 'Сегодня'
              : new Date(message.createdAt).toLocaleDateString('ru', {
                  day: 'numeric',
                  month: 'long',
                });
          return (
            <View key={message.id}>
              {showDay && (
                <View style={styles.dateBanner}>
                  <Text style={styles.dateText}>{label}</Text>
                </View>
              )}
              <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                    {message.content}
                  </Text>
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {new Date(message.createdAt).toLocaleTimeString('ru', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {mine ? outgoingReceiptMark(message.status) : ''}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        {!hydrated || loading ? (
          <ScreenState kind="loading" title="Загружаем переписку" message="Это займёт секунду" />
        ) : historyError && messages.length === 0 ? (
          <ScreenState
            kind="error"
            title="Не удалось загрузить чат"
            message={historyError}
            action={() => setReloadKey((value) => value + 1)}
          />
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>Пока нет сообщений. Напишите первым.</Text>
        ) : null}
        {typing && <Text style={styles.typing}>{peerName} печатает…</Text>}
      </ScrollView>
      <View style={styles.composer}>
        <Pressable style={styles.attach}>
          <Text style={styles.attachText}>＋</Text>
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            reportTyping(value.trim().length > 0);
          }}
          onSubmitEditing={send}
          placeholder="Напишите сообщение"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable disabled={!draft.trim()} onPress={send} style={[styles.send, !draft.trim() && styles.sendDisabled]}>
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.ink, fontSize: 34, lineHeight: 36 },
  headerCopy: { flex: 1 },
  name: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  online: { color: colors.green, fontSize: 11, marginTop: 2 },
  preview: { color: colors.muted, fontSize: 11, marginTop: 2 },
  planButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.blush },
  planText: { color: colors.berryDark, fontWeight: '800', fontSize: 12 },
  dateBanner: { alignItems: 'center', paddingTop: spacing.md },
  dateText: {
    color: colors.muted,
    fontSize: 11,
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  messages: { width: '100%', flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 7,
    borderRadius: 19,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleMine: { backgroundColor: colors.berry, borderColor: colors.berry, borderBottomLeftRadius: 19, borderBottomRightRadius: 5 },
  messageText: { color: colors.ink, lineHeight: 21 },
  messageTextMine: { color: colors.surface },
  time: { color: colors.muted, fontSize: 10, textAlign: 'right', marginTop: 4 },
  timeMine: { color: '#F2C8D5' },
  typing: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: spacing.xs },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48, fontFamily: 'Golos Text' },
  composer: {
    width: '100%',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  attach: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  attachText: { color: colors.berry, fontSize: 26 },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    color: colors.ink,
    backgroundColor: colors.soft,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.berry,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.surface, fontSize: 23, fontWeight: '900' },
});

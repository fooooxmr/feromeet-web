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
import type { ChatMessage } from '../../domain/models';
import { messages as initialMessages } from '../demo/fixtures';
import { Avatar } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/tokens';
import { chatApi, profileApi } from '../../api/endpoints';
import { FeromeetChatSocket } from '../../api/chatSocket';
import { useSessionStore } from '../../state/session';

export function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [currentUserId, setCurrentUserId] = useState('me');
  const [recipientId, setRecipientId] = useState('lena');
  const [typing, setTyping] = useState(false);
  const [socketState, setSocketState] = useState<'preview' | 'connecting' | 'connected'>('preview');
  const socketRef = useRef<FeromeetChatSocket | undefined>(undefined);
  const accessToken = useSessionStore((state) => state.accessToken);
  const demoMode = useSessionStore((state) => state.demoMode);

  useEffect(() => {
    if (!id || demoMode) return;
    let active = true;
    Promise.allSettled([chatApi.getHistory(id), profileApi.getMyProfile()]).then(
      ([historyResult, profileResult]) => {
        if (!active) return;
        if (profileResult.status === 'fulfilled') {
          setCurrentUserId(profileResult.value.id);
        }
        if (historyResult.status === 'fulfilled' && historyResult.value.length > 0) {
          setMessages(historyResult.value);
          const ownId =
            profileResult.status === 'fulfilled' ? profileResult.value.id : 'me';
          const last = historyResult.value.at(-1);
          if (last) {
            setRecipientId(
              last.senderId === ownId ? last.recipientId : last.senderId,
            );
          }
        }
      },
    );

    if (accessToken) {
      setSocketState('connecting');
      const socket = new FeromeetChatSocket(accessToken, id, {
        onMessage: (message) => {
          if (!active) return;
          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message],
          );
          socket.markRead(message.id);
        },
        onTyping: (payload) => {
          if (active && typeof payload === 'object' && payload) {
            setTyping(Boolean((payload as { isTyping?: boolean }).isTyping));
          }
        },
        onState: (state) => {
          if (!active) return;
          setSocketState(state === 'connected' ? 'connected' : 'preview');
        },
      });
      socketRef.current = socket;
      void socket.connect();
    }

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = undefined;
    };
  }, [accessToken, demoMode, id]);

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    const sent = socketRef.current?.sendMessage(recipientId, content) ?? false;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        senderId: currentUserId,
        recipientId,
        chatId: id,
        content,
        createdAt: new Date().toISOString(),
        status: sent ? 'SENDING' : 'PREVIEW',
      },
    ]);
    setDraft('');
    socketRef.current?.sendTyping(recipientId, false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Avatar name="Лена" size={44} />
        <View style={styles.headerCopy}>
          <Text style={styles.name}>Лена</Text>
          <Text style={socketState === 'connected' ? styles.online : styles.preview}>
            {socketState === 'connected' ? '● онлайн' : socketState === 'connecting' ? 'подключаемся…' : 'preview'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/meet/1042')} style={styles.planButton}>
          <Text style={styles.planText}>План встречи</Text>
        </Pressable>
      </View>
      <View style={styles.dateBanner}>
        <Text style={styles.dateText}>Сегодня · детали встречи сохраняются здесь</Text>
      </View>
      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        {messages.map((message) => {
          const mine = message.senderId === currentUserId || message.senderId === 'me';
          return (
            <View key={message.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                  {message.content}
                </Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {new Date(message.createdAt).toLocaleTimeString('ru', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {mine ? '  ✓' : ''}
                </Text>
              </View>
            </View>
          );
        })}
        {typing && <Text style={styles.typing}>Лена печатает…</Text>}
      </ScrollView>
      <View style={styles.composer}>
        <Pressable style={styles.attach}>
          <Text style={styles.attachText}>＋</Text>
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            socketRef.current?.sendTyping(recipientId, value.trim().length > 0);
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
  messages: { width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
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
  composer: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
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

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { photoUrl, type Meet } from '../../domain/models';
import { meets } from '../demo/fixtures';
import { Avatar, Button, Card, Chip, Page, ScreenState } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/tokens';
import { meetsApi } from '../../api/endpoints';
import { useSessionStore } from '../../state/session';

export function MeetTimeline({ meet }: { meet: Meet }) {
  return (
    <View style={styles.timeline}>
      {meet.stages.map((stage, index) => (
        <View key={`${stage.type}-${index}`} style={styles.stage}>
          <View style={styles.stageRail}>
            <View style={[styles.stageDot, stage.completed && styles.stageDone]}>
              <Text style={[styles.stageCheck, stage.completed && styles.stageCheckDone]}>
                {stage.completed ? '✓' : index + 1}
              </Text>
            </View>
            {index < meet.stages.length - 1 && (
              <View style={[styles.stageLine, stage.completed && styles.stageLineDone]} />
            )}
          </View>
          <View style={styles.stageCopy}>
            <Text style={[styles.stageTitle, !stage.completed && styles.stageTitleMuted]}>
              {stage.title}
            </Text>
            <Text style={styles.stageMeta}>
              {stage.completed ? 'Готово' : index === 2 ? 'Сегодня, 19:30' : 'После встречи'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function MeetDetail({ meet }: { meet: Meet }) {
  const router = useRouter();
  const demoMode = useSessionStore((state) => state.demoMode);
  const active = meet.status !== 'PASSED';
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setFeedback('');
    try {
      if (!demoMode) await action();
      setFeedback(success);
    } catch {
      setFeedback('Действие пока недоступно');
    } finally {
      setBusy(false);
    }
  };

  const advance = async () => {
    const status = meet.status.toUpperCase();
    if (status.includes('INVIT')) {
      await run(() => meetsApi.accept(meet.meetId), 'Приглашение принято');
    } else if (status.includes('PLAN') || status.includes('AGREE')) {
      await run(
        () => meet.isYouHunter
          ? meetsApi.consentAsHunter(meet.meetId)
          : meetsApi.consentAsVictim(meet.meetId),
        'Детали подтверждены',
      );
    } else {
      await run(
        () => meet.isYouHunter
          ? meetsApi.arriveAsHunter(meet.meetId)
          : meetsApi.arriveAsVictim(meet.meetId),
        'Приход подтверждён',
      );
    }
  };

  return (
    <Card>
      <View style={styles.personRow}>
        <Avatar name={meet.user.name} size={62} uri={photoUrl(meet.user.mainSmallPhotoFilename)} />
        <View style={styles.personCopy}>
          <Text style={styles.personName}>Встреча с {meet.user.name}</Text>
          <Text style={styles.personMeta}>{meet.ferotag} · {meet.price} BYN</Text>
        </View>
        <Chip label={active ? 'В процессе' : 'Завершена'} active={active} />
      </View>
      <View style={styles.divider} />
      <MeetTimeline meet={meet} />
      {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
      <View style={styles.detailActions}>
        {active ? (
          <>
            <View style={styles.primaryAction}>
              <Button label="Открыть чат" onPress={() => router.push(`/chat/${meet.chatId}`)} />
            </View>
            <Button
              disabled={busy}
              label={busy ? 'Подтверждаем…' : 'Подтвердить этап'}
              variant="secondary"
              onPress={() => void advance()}
            />
            <Button
              disabled={busy}
              label="Отменить"
              variant="ghost"
              onPress={() => void run(() => meetsApi.cancel(meet.meetId), 'Встреча отменена')}
            />
            <Button
              disabled={busy}
              label="Прочитано"
              variant="ghost"
              onPress={() => void run(() => meetsApi.markAsRead(meet.meetId), 'Обновления скрыты')}
            />
            <Button label="Детали" variant="secondary" onPress={() => router.push(`/meet/${meet.meetId}`)} />
          </>
        ) : (
          <>
            <Button
              label="Оценить встречу"
              variant="secondary"
              onPress={() =>
                void run(
                  () =>
                    meetsApi.rate({
                      meetId: meet.meetId,
                      score: 5,
                      comment: '',
                      impressionTags: [],
                    }),
                  'Оценка отправлена',
                )
              }
            />
            <Button
              disabled={busy}
              label="Скрыть"
              variant="ghost"
              onPress={() => void run(() => meetsApi.hide(meet.meetId), 'Встреча скрыта')}
            />
          </>
        )}
      </View>
    </Card>
  );
}

export function MeetsScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1040;
  const demoMode = useSessionStore((state) => state.demoMode);
  const [tab, setTab] = useState<'active' | 'passed'>('active');
  const [availableMeets, setAvailableMeets] = useState<Meet[]>(demoMode ? meets : []);
  const [error, setError] = useState('');
  const filtered = availableMeets.filter((meet) => (tab === 'active' ? meet.status !== 'PASSED' : meet.status === 'PASSED'));
  const [selectedId, setSelectedId] = useState(demoMode ? meets[0]?.meetId ?? 0 : 0);
  const selected = availableMeets.find((meet) => meet.meetId === selectedId) ?? filtered[0];

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    Promise.all([meetsApi.getActive(), meetsApi.getPassed()])
      .then(([current, passed]) => {
        if (!active) return;
        const next = [...(Array.isArray(current) ? current : []), ...(Array.isArray(passed) ? passed : [])];
        setAvailableMeets(next);
        setError('');
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить встречи');
      });
    return () => {
      active = false;
    };
  }, [demoMode]);

  return (
    <Page
      title="Встречи"
      action={
        <View style={styles.tabs}>
          <Chip label="Активные" active={tab === 'active'} onPress={() => setTab('active')} />
          <Chip label="Прошедшие" active={tab === 'passed'} onPress={() => setTab('passed')} />
        </View>
      }
    >
      {error ? (
        <ScreenState kind="error" title="Ошибка" message={error} />
      ) : filtered.length === 0 ? (
        <ScreenState
          kind="empty"
          title={tab === 'active' ? 'Пока нет встреч' : 'Прошедших встреч нет'}
          message="Приглашения и подтверждённые свидания появятся здесь."
        />
      ) : desktop ? (
        <View style={styles.split}>
          <View style={styles.meetList}>
            {filtered.map((meet) => (
              <Pressable
                key={meet.meetId}
                onPress={() => setSelectedId(meet.meetId)}
                style={[styles.meetRow, selected?.meetId === meet.meetId && styles.meetRowActive]}
              >
                <Avatar name={meet.user.name} uri={photoUrl(meet.user.mainSmallPhotoFilename)} />
                <View style={styles.personCopy}>
                  <Text style={styles.rowTitle}>{meet.user.name}</Text>
                  <Text style={styles.rowMeta}>{meet.ferotag}</Text>
                </View>
                {meet.countUnreadMessages > 0 && (
                  <Text style={styles.badge}>{meet.countUnreadMessages}</Text>
                )}
              </Pressable>
            ))}
          </View>
          <View style={styles.detail}>{selected && <MeetDetail meet={selected} />}</View>
        </View>
      ) : (
        <View style={styles.mobileCards}>
          {filtered.map((meet) => <MeetDetail key={meet.meetId} meet={meet} />)}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.xs },
  split: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  meetList: { width: 310, gap: spacing.sm },
  meetRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  meetRowActive: { borderColor: colors.berry, backgroundColor: colors.blush },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personCopy: { flex: 1 },
  personName: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  personMeta: { color: colors.muted, marginTop: 4 },
  rowTitle: { color: colors.ink, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.surface,
    backgroundColor: colors.berry,
    fontWeight: '800',
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.lg },
  timeline: { gap: 0 },
  stage: { minHeight: 65, flexDirection: 'row', gap: spacing.md },
  stageRail: { width: 28, alignItems: 'center' },
  stageDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stageDone: { borderColor: colors.green, backgroundColor: colors.green },
  stageCheck: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  stageCheckDone: { color: colors.surface },
  stageLine: { width: 2, flex: 1, backgroundColor: colors.line },
  stageLineDone: { backgroundColor: colors.green },
  stageCopy: { flex: 1, paddingTop: 3 },
  stageTitle: { color: colors.ink, fontWeight: '800' },
  stageTitleMuted: { color: colors.muted },
  stageMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryAction: { flex: 1 },
  detail: { flex: 1 },
  mobileCards: { gap: spacing.md },
  feedback: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },
});

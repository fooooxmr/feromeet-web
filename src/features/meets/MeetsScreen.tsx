import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { photoUrl, type Meet } from '../../domain/models';
import { formatTagLabel } from '../../domain/tags';
import { meets } from '../demo/fixtures';
import { Avatar, Button, Card, Chip, Page, ScreenState } from '../../components/ui';
import { colors, fontFamily, spacing } from '../../theme/tokens';
import { useIsDesktop } from '../../theme/layout';
import { meetsApi } from '../../api/endpoints';
import { useSessionStore } from '../../state/session';

function stageMeta(stage: Meet['stages'][number]) {
  if (stage.subtitle) return stage.subtitle;
  if (stage.dateTime) {
    return new Date(stage.dateTime).toLocaleString('ru', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (stage.completed) return 'Готово';
  return 'Сейчас';
}

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
            <Text style={[styles.stageTitle, !stage.completed && styles.stageTitleMuted]} numberOfLines={2}>
              {stage.title || `Этап ${index + 1}`}
            </Text>
            <Text style={styles.stageMeta}>{stageMeta(stage)}</Text>
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
  const tag = formatTagLabel(meet.ferotag);

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
        <Avatar name={meet.user.name} size={52} uri={photoUrl(meet.user.mainSmallPhotoFilename)} />
        <View style={styles.personCopy}>
          <Text style={styles.personName} numberOfLines={1}>{meet.user.name}</Text>
          <Text style={styles.personMeta} numberOfLines={1}>
            {tag}{meet.price ? ` · ${meet.price} BYN` : ''}
          </Text>
        </View>
        <Chip label={active ? 'В процессе' : 'Завершена'} active={active} />
      </View>
      <View style={styles.divider} />
      <MeetTimeline meet={meet} />
      {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
      <View style={styles.detailActions}>
        {active ? (
          <>
            <Button label="Открыть чат" onPress={() => router.push(`/chat/${meet.chatId}`)} />
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
  const desktop = useIsDesktop();
  const demoMode = useSessionStore((state) => state.demoMode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const [tab, setTab] = useState<'active' | 'passed'>('active');
  const [availableMeets, setAvailableMeets] = useState<Meet[]>(demoMode ? meets : []);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const filtered = availableMeets.filter((meet) => (tab === 'active' ? meet.status !== 'PASSED' : meet.status === 'PASSED'));

  useEffect(() => {
    if (!hydrated || demoMode) return;
    let active = true;
    setLoading(true);
    Promise.all([meetsApi.getActive(), meetsApi.getPassed()])
      .then(([current, passed]) => {
        if (!active) return;
        setAvailableMeets([
          ...(Array.isArray(current) ? current : []),
          ...(Array.isArray(passed) ? passed : []),
        ]);
        setError('');
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить встречи');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demoMode, hydrated]);

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
      {loading ? (
        <ScreenState kind="loading" title="Загружаем встречи" message="Это займёт секунду" />
      ) : error ? (
        <ScreenState kind="error" title="Ошибка" message={error} />
      ) : filtered.length === 0 ? (
        <ScreenState
          kind="empty"
          title={tab === 'active' ? 'Пока нет встреч' : 'Прошедших встреч нет'}
          message="Приглашения и подтверждённые свидания появятся здесь."
        />
      ) : (
        <View style={[styles.mobileCards, desktop && styles.desktopGrid]}>
          {filtered.map((meet) => (
            <View key={meet.meetId} style={desktop ? styles.desktopCard : undefined}>
              <MeetDetail meet={meet} />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, maxWidth: 200 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personCopy: { flex: 1, minWidth: 0 },
  personName: { color: colors.ink, fontSize: 17, fontWeight: '700', fontFamily },
  personMeta: { color: colors.muted, marginTop: 4, fontFamily },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.lg },
  timeline: { gap: 0 },
  stage: { minHeight: 56, flexDirection: 'row', gap: spacing.md },
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
  stageCheck: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  stageCheckDone: { color: colors.surface },
  stageLine: { width: 2, flex: 1, backgroundColor: colors.line },
  stageLineDone: { backgroundColor: colors.green },
  stageCopy: { flex: 1, paddingTop: 3, minWidth: 0 },
  stageTitle: { color: colors.ink, fontWeight: '700', fontFamily },
  stageTitleMuted: { color: colors.muted },
  stageMeta: { color: colors.muted, fontSize: 12, marginTop: 4, fontFamily },
  detailActions: { flexDirection: 'column', gap: spacing.sm, marginTop: spacing.md },
  mobileCards: { gap: spacing.md },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  desktopCard: { width: '48%', minWidth: 320, flexGrow: 1 },
  feedback: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: spacing.sm, fontFamily },
});

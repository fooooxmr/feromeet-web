import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page, ScreenState } from '../../src/components/ui';
import { meets } from '../../src/features/demo/fixtures';
import { MeetDetail } from '../../src/features/meets/MeetsScreen';
import { colors, spacing } from '../../src/theme/tokens';
import { meetsApi } from '../../src/api/endpoints';
import type { Meet } from '../../src/domain/models';
import { useSessionStore } from '../../src/state/session';

export default function MeetRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const demoMode = useSessionStore((state) => state.demoMode);
  const [meet, setMeet] = useState<Meet | undefined>(() =>
    demoMode ? meets.find((item) => String(item.meetId) === id) : undefined,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode) return;
    const meetId = Number(id);
    if (!Number.isFinite(meetId)) return;
    let active = true;
    meetsApi.getById(meetId)
      .then((value) => {
        if (active) {
          setMeet(value);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить встречу');
      });
    return () => {
      active = false;
    };
  }, [demoMode, id]);

  if (!meet) {
    return (
      <ScreenState
        kind="error"
        title={error ? 'Ошибка' : 'Встреча не найдена'}
        message={error || 'Возможно, она была отменена или ссылка устарела.'}
        action={() => router.replace('/meets')}
      />
    );
  }

  return (
    <Page
      eyebrow="План встречи"
      title={`Вы и ${meet.user.name}`}
      subtitle="Следующий шаг всегда подсвечен — ничего не потеряется."
      action={
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>
      }
    >
      <View style={styles.bound}>
        <MeetDetail meet={meet} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  bound: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  back: { padding: spacing.sm },
  backText: { color: colors.berry, fontWeight: '800' },
});

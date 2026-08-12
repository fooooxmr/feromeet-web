import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Page, ScreenState } from '../../src/components/ui';
import { meets } from '../../src/features/demo/fixtures';
import { MeetDetail } from '../../src/features/meets/MeetsScreen';
import { colors, spacing } from '../../src/theme/tokens';
import { meetsApi } from '../../src/api/endpoints';
import type { Meet } from '../../src/domain/models';

export default function MeetRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [meet, setMeet] = useState<Meet | undefined>(() =>
    meets.find((item) => String(item.meetId) === id),
  );

  useEffect(() => {
    const meetId = Number(id);
    if (!Number.isFinite(meetId)) return;
    let active = true;
    meetsApi.getById(meetId)
      .then((value) => {
        if (active) setMeet(value);
      })
      .catch(() => {
        // Keep the local meet detail available while the backend is unreachable.
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!meet) {
    return (
      <ScreenState
        kind="error"
        title="Встреча не найдена"
        message="Возможно, она была отменена или ссылка устарела."
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

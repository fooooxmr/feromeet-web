import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { discoveryApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { Avatar, Button, Chip, Page, ScreenState } from '../../components/ui';
import { ageFromBirthday, photoUrl, type ReactionUser } from '../../domain/models';
import { people } from '../demo/fixtures';
import { useSessionStore } from '../../state/session';
import { colors, radius, spacing } from '../../theme/tokens';

export function FavouritesScreen() {
  const router = useRouter();
  const demoMode = useSessionStore((state) => state.demoMode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const [tab, setTab] = useState<'LIKE' | 'FAVORITE'>('FAVORITE');
  const [items, setItems] = useState<ReactionUser[]>(
    demoMode ? people.map((person) => ({ ...person, reactionType: person.isFavorite ? 'FAVORITE' : 'LIKE' })) : [],
  );
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const filtered = items.filter((item) =>
    tab === 'FAVORITE'
      ? item.reactionType === 'FAVORITE' || item.isFavorite
      : item.reactionType === 'LIKE' || !item.isFavorite,
  );

  useEffect(() => {
    if (!hydrated || demoMode) return;
    setLoading(true);
    discoveryApi
      .getFavorites()
      .then((users) => {
        if (Array.isArray(users)) setItems(users);
        setError('');
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'Не удалось загрузить симпатии');
      })
      .finally(() => setLoading(false));
  }, [demoMode, hydrated]);

  return (
    <Page title="Симпатии" subtitle="Лайки и избранное в одном месте.">
      <View style={styles.tabs}>
        <Chip label="Лайки" active={tab === 'LIKE'} onPress={() => setTab('LIKE')} />
        <Chip label="Избранное" active={tab === 'FAVORITE'} onPress={() => setTab('FAVORITE')} />
      </View>
      {loading ? (
        <ScreenState kind="loading" title="Загружаем симпатии" message="Это займёт секунду" />
      ) : error ? (
        <ScreenState kind="error" title="Ошибка" message={error} />
      ) : filtered.length === 0 ? (
        <ScreenState
          kind="empty"
          title="Пока пусто"
          message="Отмечайте анкеты сердцами, чтобы вернуться к ним позже."
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((person) => (
            <Pressable
              key={person.id}
              onPress={() => router.push(`/profile/${person.id}`)}
              style={styles.row}
            >
              <Avatar
                name={person.name}
                uri={photoUrl(person.mainSmallPhotoFilename || person.mainPhotoFilename)}
              />
              <View style={styles.copy}>
                <Text style={styles.name}>
                  {person.name}
                  {ageFromBirthday(person.birthday) ? `, ${ageFromBirthday(person.birthday)}` : ''}
                </Text>
                <Text style={styles.meta}>{person.city ?? 'Рядом'}</Text>
              </View>
              <Button
                label="GO"
                onPress={() => router.push(`/profile/${person.id}`)}
              />
            </Pressable>
          ))}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.sm },
  row: {
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  copy: { flex: 1 },
  name: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 3 },
});

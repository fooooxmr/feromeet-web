import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { discoveryApi } from '../../src/api/endpoints';
import { Avatar, Button, Card, Chip, Page, ScreenState } from '../../src/components/ui';
import { photoUrl, type FeromeetUser } from '../../src/domain/models';
import { people } from '../../src/features/demo/fixtures';
import { useSessionStore } from '../../src/state/session';
import { colors, spacing } from '../../src/theme/tokens';

export default function PublicProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const demoMode = useSessionStore((state) => state.demoMode);
  const [profile, setProfile] = useState<FeromeetUser | undefined>(
    demoMode ? people.find((person) => person.id === id) : undefined,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || demoMode) return;
    let active = true;
    discoveryApi
      .getUser(id)
      .then((user) => {
        if (active) {
          setProfile(user);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить профиль');
      });
    return () => {
      active = false;
    };
  }, [demoMode, id]);

  if (!profile) {
    return (
      <ScreenState
        kind="error"
        title={error ? 'Ошибка' : 'Профиль не найден'}
        message={error || 'Возможно, пользователь больше не доступен.'}
        action={() => router.back()}
      />
    );
  }

  return (
    <Page
      eyebrow="Полный профиль"
      title={profile.name}
      subtitle={[profile.city, profile.height ? `${profile.height} см` : undefined]
        .filter(Boolean)
        .join(' · ')}
      action={<Button label="← Назад" variant="ghost" onPress={() => router.back()} />}
    >
      <View style={styles.bound}>
        <Card>
          <View style={styles.hero}>
            <Avatar
              name={profile.name}
              size={128}
              uri={photoUrl(profile.mainPhotoFilename)}
            />
            <View style={styles.copy}>
              <Text style={styles.rating}>★ {profile.rating ?? '—'}</Text>
              <Text style={styles.about}>{profile.textAbout || 'Пока без описания'}</Text>
              <View style={styles.chips}>
                {profile.ferotags?.map((tag) => <Chip key={tag} label={tag} />)}
              </View>
            </View>
          </View>
          <Button
            label={profile.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            variant="secondary"
            onPress={() => {
              if (!demoMode) {
                void discoveryApi.favorite(profile.id, !profile.isFavorite);
              }
            }}
          />
        </Card>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  bound: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'center' },
  copy: { flex: 1, minWidth: 240, gap: spacing.md },
  rating: { color: colors.berry, fontWeight: '900', fontSize: 18 },
  about: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

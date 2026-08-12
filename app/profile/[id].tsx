import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { discoveryApi } from '../../src/api/endpoints';
import { Button, Photo, ScreenState, TagChip } from '../../src/components/ui';
import { ageFromBirthday, photoUrl, userPhotos, type FeromeetUser } from '../../src/domain/models';
import { userChips } from '../../src/domain/tags';
import { people } from '../../src/features/demo/fixtures';
import { useSessionStore } from '../../src/state/session';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

export default function PublicProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const demoMode = useSessionStore((state) => state.demoMode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const [profile, setProfile] = useState<FeromeetUser | undefined>(
    demoMode ? people.find((person) => person.id === id) : undefined,
  );
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!id || demoMode) {
      if (demoMode) setLoading(false);
      return;
    }
    if (!hydrated) return;
    let active = true;
    setLoading(true);
    discoveryApi
      .getUser(id)
      .then((user) => {
        if (active) {
          setProfile(user);
          setFavorite(Boolean(user.isFavorite));
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить профиль');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demoMode, hydrated, id]);

  if (loading || !hydrated) {
    return <ScreenState kind="loading" title="Загружаем профиль" message="Это займёт секунду" />;
  }

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

  const age = ageFromBirthday(profile.birthday);
  const photos = userPhotos(profile);
  const uri = photoUrl(photos[photoIndex] ?? photos[0] ?? profile.mainPhotoFilename);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Назад</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (photos.length) setPhotoIndex((value) => (value + 1) % photos.length);
        }}
        style={styles.hero}
      >
        {uri ? (
          <Photo uri={uri} style={styles.photo} accessibilityLabel={profile.name} />
        ) : (
          <View style={[styles.photo, styles.fallback]} />
        )}
        <View style={styles.storyRow}>
          {(photos.length ? photos : ['placeholder']).map((photo, index) => (
            <View
              key={`${photo}-${index}`}
              style={[styles.storyBar, index === photoIndex && styles.storyBarActive]}
            />
          ))}
        </View>
      </Pressable>
      <Text style={styles.name}>
        {profile.name.trim()}
        {age ? `, ${age}` : ''}
      </Text>
      <Text style={styles.meta}>
        {[profile.city, profile.height ? `${profile.height} см` : undefined]
          .filter(Boolean)
          .join(' · ')}
        {profile.rating != null ? `   ★  ${profile.rating}` : ''}
      </Text>
      <Text style={styles.about}>{profile.textAbout || 'Пока без описания'}</Text>
      <View style={styles.chips}>
        {userChips(profile).map((tag) => (
          <TagChip key={tag.key || tag.label} tag={tag} />
        ))}
      </View>
      <Button
        label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        variant="secondary"
        onPress={() => {
          const next = !favorite;
          setFavorite(next);
          if (!demoMode) void discoveryApi.favorite(profile.id, next);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: 28 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { color: colors.berry, fontWeight: '700', fontFamily },
  hero: {
    height: 360,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#1A1714',
  },
  photo: { width: '100%', height: '100%' },
  fallback: { backgroundColor: '#2A211C' },
  storyRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  storyBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  storyBarActive: { backgroundColor: '#fff' },
  name: { color: colors.ink, fontSize: 26, fontWeight: '800', fontFamily },
  meta: { color: colors.muted, fontWeight: '600', fontFamily, marginTop: -4 },
  about: { color: colors.ink, fontSize: 15, lineHeight: 22, fontFamily },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

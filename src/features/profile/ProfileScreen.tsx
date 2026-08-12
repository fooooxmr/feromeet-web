import { useEffect, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Button, Card, Chip, Field, Page, ScreenState, Sheet, TagChip } from '../../components/ui';
import { colors, fontFamily, spacing } from '../../theme/tokens';
import { profileApi } from '../../api/endpoints';
import { ageFromBirthday, photoUrl, type FeromeetUser } from '../../domain/models';
import { userChips } from '../../domain/tags';
import { demoMe } from '../demo/fixtures';
import { useSessionStore } from '../../state/session';

function ProfilePreview({ profile }: { profile?: FeromeetUser }) {
  const name = profile?.name ?? 'Профиль';
  const age = ageFromBirthday(profile?.birthday);
  return (
    <Card>
      <View style={styles.hero}>
        <Avatar name={name} size={96} uri={photoUrl(profile?.mainPhotoFilename)} />
        <View style={styles.heroCopy}>
          <Text style={styles.name}>{age ? `${name}, ${age}` : name}</Text>
          <Text style={styles.location}>{[profile?.city, profile?.height ? `${profile.height} см` : undefined].filter(Boolean).join(' · ') || 'Заполните профиль'}</Text>
          <View style={styles.readiness}>
            <View style={[styles.readinessFill, { width: `${profile?.readyToGo ?? 0}%` }]} />
          </View>
          <Text style={styles.readinessText}>Готовность {profile?.readyToGo ?? 0}%</Text>
        </View>
      </View>
      <Text style={styles.bio}>
        {profile?.textAbout ?? 'Добавьте описание, чтобы приглашения выглядели живыми.'}
      </Text>
      <View style={styles.chips}>
        {userChips(profile ?? {}).map((tag) => (
          <TagChip key={tag.key || tag.label} tag={tag} />
        ))}
      </View>
    </Card>
  );
}

export function ProfileScreen({ editing = false }: { editing?: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profile, setProfile] = useState<FeromeetUser>();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [height, setHeight] = useState('170');
  const [about, setAbout] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const signOut = useSessionStore((state) => state.signOut);
  const demoMode = useSessionStore((state) => state.demoMode);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (demoMode) {
      setProfile(demoMe);
      setName(demoMe.name);
      setCity(demoMe.city ?? '');
      setHeight(String(demoMe.height ?? 170));
      setAbout(demoMe.textAbout ?? '');
      return;
    }
    let active = true;
    setLoading(true);
    profileApi.getMyProfile()
      .then((value) => {
        if (active) {
          setProfile(value);
          if (value.height) setHeight(String(value.height));
          if (value.textAbout) setAbout(value.textAbout);
          if (value.name) setName(value.name);
          if (value.city) setCity(value.city);
          setMessage('');
        }
      })
      .catch(() => {
        if (active) setMessage('Не удалось загрузить профиль');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demoMode]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (!demoMode) {
        await Promise.all([
          profileApi.saveHeight(Number(height)),
          profileApi.saveAbout(about),
          city ? profileApi.saveLocation(0, 0, city) : Promise.resolve(),
        ]);
      }
      router.back();
    } catch {
      setMessage('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      if (!demoMode) await profileApi.deleteAccount();
      await signOut();
      router.replace('/phone');
    } catch {
      setMessage('Не удалось удалить аккаунт');
      setDeleteOpen(false);
    }
  };

  const choosePhoto = async () => {
    setMessage('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.82,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    try {
      if (demoMode) {
        setPhotoUri(asset.uri);
        setMessage('Фото обновлено в demo');
        return;
      }
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((response) => response.blob());
        form.append('mainPhoto', blob, asset.fileName || 'profile.jpg');
        form.append('mainSmallPhoto', blob, asset.fileName || 'profile-small.jpg');
      } else {
        const file = {
          uri: asset.uri,
          name: asset.fileName || 'profile.jpg',
          type: asset.mimeType || 'image/jpeg',
        };
        form.append('mainPhoto', file as unknown as Blob);
        form.append('mainSmallPhoto', file as unknown as Blob);
      }
      await profileApi.savePhotos(form);
      setPhotoUri(asset.uri);
      setMessage('Фото обновлено');
    } catch {
      setMessage('Не удалось загрузить фото');
    }
  };

  if (loading) {
    return <ScreenState kind="loading" title="Загружаем профиль" message="Это займёт секунду" />;
  }

  if (editing) {
    return (
      <Page title="Профиль">
        <Card>
          <View style={styles.photoEdit}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <Avatar name={profile?.name ?? 'Профиль'} size={90} />
            )}
            <View style={styles.heroCopy}>
              <Text style={styles.sectionTitle}>Фотографии</Text>
              <Text style={styles.muted}>Главное фото и до пяти дополнительных</Text>
              <View style={styles.smallButton}>
                <Button label="Выбрать фото" variant="secondary" onPress={() => void choosePhoto()} />
              </View>
            </View>
          </View>
          <View style={styles.form}>
            <Field label="Имя" value={name} onChangeText={setName} />
            <Field label="Город" value={city} onChangeText={setCity} />
            <Field label="Рост, см" keyboardType="numeric" value={height} onChangeText={setHeight} />
            <Field
              label="О себе"
              multiline
              value={about}
              onChangeText={setAbout}
            />
            <Text style={styles.fieldLabel}>Интересы</Text>
            <View style={styles.chips}>
              {(profile?.ferotags ?? ['Первое свидание', 'Кофе']).map((interest) => (
                <Chip key={interest} label={interest} active />
              ))}
            </View>
            {!!message && <Text style={styles.error}>{message}</Text>}
            <Button
              disabled={saving || !Number.isFinite(Number(height))}
              label={saving ? 'Сохраняем…' : 'Сохранить изменения'}
              onPress={() => void saveProfile()}
            />
          </View>
        </Card>
      </Page>
    );
  }

  return (
    <>
      <Page
        title="Профиль"
        action={<Button label="Редактировать" variant="secondary" onPress={() => router.push('/profile/edit')} />}
      >
        <View style={styles.columns}>
          <ProfilePreview profile={profile} />
          <Card>
            <Text style={styles.sectionTitle}>Готов к встрече</Text>
            <View style={styles.settingRow}>
              <Text style={styles.muted}>Показывать профиль в свайпах</Text>
              <Switch
                value={ready}
                onValueChange={setReady}
                thumbColor={ready ? colors.berry : colors.muted}
              />
            </View>
          </Card>
          <Card>
            <Text style={styles.sectionTitle}>Безопасность</Text>
            <Text style={styles.muted}>Управление аккаунтом и поддержка</Text>
            <View style={styles.settingsActions}>
              <Button
                label="Написать в поддержку"
                variant="ghost"
                onPress={() => void Linking.openURL('mailto:hello@inera.by')}
              />
              <Button
                label="Выйти"
                variant="ghost"
                onPress={() => void signOut().then(() => router.replace('/phone'))}
              />
              <Button label="Удалить аккаунт" variant="danger" onPress={() => setDeleteOpen(true)} />
            </View>
          </Card>
        </View>
      </Page>
      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить аккаунт?">
        <Text style={styles.muted}>
          Профиль, встречи и переписка будут удалены без возможности восстановления.
        </Text>
        <Button label="Нет, оставить аккаунт" onPress={() => setDeleteOpen(false)} />
        {!!message && <Text style={styles.error}>{message}</Text>}
        <Button label="Удалить навсегда" variant="danger" onPress={() => void deleteAccount()} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  columns: { gap: spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 5 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '700', fontFamily },
  location: { color: colors.muted, fontFamily },
  readiness: {
    height: 7,
    marginTop: spacing.sm,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.line,
  },
  readinessFill: { height: '100%', backgroundColor: colors.green },
  readinessText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  bio: { color: colors.ink, fontSize: 15, lineHeight: 23, marginVertical: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  settingsActions: { gap: spacing.sm, marginTop: spacing.md },
  photoEdit: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  smallButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
  form: { gap: spacing.md, marginTop: spacing.xl },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 12 },
  photo: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.soft },
});

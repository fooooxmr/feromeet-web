import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Chip, Field, Page } from '../../components/ui';
import { authApi, profileApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { colors, spacing } from '../../theme/tokens';

const TAGS = ['Первое свидание', 'Музыка', 'Выпечка', 'Бег', 'Кофе', 'Кино'];

export function OnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [height, setHeight] = useState('170');
  const [about, setAbout] = useState('');
  const [tags, setTags] = useState<string[]>(['Первое свидание']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; blob?: Blob; name: string; type: string }>();

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.82,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (Platform.OS === 'web') {
      const blob = await fetch(asset.uri).then((response) => response.blob());
      setPhoto({ uri: asset.uri, blob, name: asset.fileName || 'profile.jpg', type: asset.mimeType || 'image/jpeg' });
    } else {
      setPhoto({
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('profile', JSON.stringify({
        name,
        city,
        height: Number(height),
        textAbout: about,
        ferotags: tags,
      }));
      if (photo?.blob) {
        form.append('mainPhoto', photo.blob, photo.name);
        form.append('mainSmallPhoto', photo.blob, photo.name);
      } else if (photo) {
        form.append('mainPhoto', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
      }
      try {
        await authApi.saveProfile(form);
      } catch {
        await Promise.all([
          profileApi.saveAbout(about),
          profileApi.saveHeight(Number(height)),
          profileApi.saveFerotags(tags),
          city ? profileApi.saveLocation(0, 0, city) : Promise.resolve(),
        ]);
      }
      router.replace('/swipes');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось сохранить профиль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Расскажите о себе"
      subtitle="Имя, фото и формат встречи — этого достаточно, чтобы начать."
    >
      <View style={styles.form}>
        <Button label={photo ? 'Фото выбрано' : 'Добавить фото'} variant="secondary" onPress={() => void choosePhoto()} />
        <Field label="Имя" value={name} onChangeText={setName} />
        <Field label="Город" value={city} onChangeText={setCity} />
        <Field label="Рост, см" keyboardType="numeric" value={height} onChangeText={setHeight} />
        <Field label="О себе" multiline value={about} onChangeText={setAbout} />
        <Text style={styles.label}>Форматы встреч</Text>
        <View style={styles.tags}>
          {TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              active={tags.includes(tag)}
              onPress={() =>
                setTags((current) =>
                  current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                )
              }
            />
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button
          disabled={busy || name.trim().length < 2}
          label={busy ? 'Сохраняем…' : 'Начать'}
          onPress={() => void save()}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, maxWidth: 520 },
  label: { color: colors.ink, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger },
});

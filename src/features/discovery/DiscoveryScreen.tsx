import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ageFromBirthday,
  photoUrl,
  userPhotos,
  type ExpenseType,
  type FeromeetUser,
  type SearchPreference,
} from '../../domain/models';
import { people } from '../demo/fixtures';
import { Avatar, BrandMark, Button, Chip, Field, ScreenState, Sheet } from '../../components/ui';
import { colors, gradient, radius, shadow, spacing } from '../../theme/tokens';
import { discoveryApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useSessionStore } from '../../state/session';

const EXPENSE_OPTIONS: Array<{ type: ExpenseType; title: string; subtitle: string }> = [
  { type: 'I_PAY', title: 'Я угощаю', subtitle: 'Всё включено' },
  { type: 'SPLIT', title: 'Пополам', subtitle: '50/50' },
  { type: 'YOU_PAY', title: 'Угостишь меня?', subtitle: 'За твой счёт' },
];

function displayAge(person: FeromeetUser) {
  return ageFromBirthday(person.birthday) ?? 22;
}

function DiscoveryCard({
  person,
  width,
  height,
  onNextPhoto,
  photoIndex,
}: {
  person: FeromeetUser;
  width: number;
  height: number;
  onNextPhoto: () => void;
  photoIndex: number;
}) {
  const photos = userPhotos(person);
  const uri = photoUrl(photos[photoIndex] ?? photos[0] ?? person.mainPhotoFilename);

  return (
    <Pressable onPress={onNextPhoto} style={[styles.card, { width, height }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardFallback]}>
          <Avatar name={person.name} size={120} />
        </View>
      )}
      <View style={styles.cardScrim} />
      <View style={styles.storyRow}>
        {(photos.length ? photos : ['placeholder']).map((photo, index) => (
          <View
            key={`${photo}-${index}`}
            style={[styles.storyBar, index === photoIndex && styles.storyBarActive]}
          />
        ))}
      </View>
      <View style={styles.readyBadge}>
        <Text style={styles.readyText}>{person.readyToGo ?? 50} %</Text>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardName}>
          {person.name}, {displayAge(person)}
          {person.lastSeen ? '' : '  '}
          <Text style={styles.onlineDot}> ●</Text>
        </Text>
        <Text style={styles.cardCity}>
          {person.city ?? 'Рядом'}  ★ {person.rating ?? '—'}
        </Text>
        <View style={styles.tagRow}>
          {person.ferotags?.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.glassChip}>
              <Text style={styles.glassChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function ActionDock({
  onSkip,
  onGo,
  onFavorite,
  favorite,
}: {
  onSkip: () => void;
  onGo: () => void;
  onFavorite: () => void;
  favorite?: boolean;
}) {
  return (
    <View style={styles.dock}>
      <Pressable accessibilityLabel="Пропустить" onPress={onSkip} style={styles.dockButton}>
        <Text style={styles.dockSkip}>✕</Text>
      </Pressable>
      <Pressable accessibilityLabel="Пригласить" onPress={onGo} style={[styles.dockGo, gradient]}>
        <Text style={styles.dockGoHeart}>♥</Text>
        <Text style={styles.dockGoText}>GO</Text>
      </Pressable>
      <Pressable accessibilityLabel="В симпатии" onPress={onFavorite} style={styles.dockButton}>
        <Text style={[styles.dockHeart, favorite && styles.dockHeartActive]}>{favorite ? '♥♥' : '♡♡'}</Text>
      </Pressable>
    </View>
  );
}

function InviteSheet({
  person,
  visible,
  onClose,
  onInvite,
  busy,
  error,
}: {
  person: FeromeetUser;
  visible: boolean;
  onClose: () => void;
  onInvite: (expenseType: ExpenseType, ferotag: string, comment: string) => void;
  busy: boolean;
  error: string;
}) {
  const [expense, setExpense] = useState<ExpenseType>('I_PAY');
  const [ferotag, setFerotag] = useState(person.ferotags?.[0] ?? 'Первое свидание');
  const [comment, setComment] = useState('');
  const tags = person.ferotags?.length ? person.ferotags : ['Первое свидание', 'Наедине', 'Между строк'];

  return (
    <Sheet visible={visible} title={`Пригласить ${person.name}`} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inviteBody}>
        <Text style={styles.sectionLabel}>Участие в расходах</Text>
        <View style={styles.expenseRow}>
          {EXPENSE_OPTIONS.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => setExpense(option.type)}
              style={[styles.expenseCard, expense === option.type && styles.expenseCardActive]}
            >
              <Text style={[styles.expenseTitle, expense === option.type && styles.expenseTitleActive]}>
                {option.title}
              </Text>
              <Text style={[styles.expenseSub, expense === option.type && styles.expenseTitleActive]}>
                {option.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionLabel}>Чем займёмся?</Text>
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <Chip key={tag} label={tag} active={ferotag === tag} onPress={() => setFerotag(tag)} />
          ))}
        </View>
        <Field
          label="Сообщение"
          multiline
          maxLength={150}
          value={comment}
          onChangeText={setComment}
          placeholder="Давай встретимся там, где будет только ты и я"
        />
        <Text style={styles.counter}>{comment.length}/150</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button
          disabled={busy || !ferotag}
          label={busy ? 'Отправляем…' : 'Отправить'}
          onPress={() => onInvite(expense, ferotag, comment)}
        />
      </ScrollView>
    </Sheet>
  );
}

function FilterSheet({
  visible,
  onClose,
  preference,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  preference: SearchPreference;
  onSave: (preference: SearchPreference) => void;
}) {
  const [draft, setDraft] = useState(preference);
  useEffect(() => setDraft(preference), [preference]);

  return (
    <Sheet visible={visible} title="Фильтры" onClose={onClose}>
      <Text style={styles.sectionLabel}>Кого показать</Text>
      <View style={styles.tagRow}>
        {['ANY', 'FEMALE', 'MALE'].map((sex) => (
          <Chip
            key={sex}
            label={sex === 'ANY' ? 'Все' : sex === 'FEMALE' ? 'Девушки' : 'Парни'}
            active={draft.sex === sex}
            onPress={() => setDraft({ ...draft, sex })}
          />
        ))}
      </View>
      <Field
        label="Возраст от"
        keyboardType="numeric"
        value={String(draft.ageMin)}
        onChangeText={(value) => setDraft({ ...draft, ageMin: Number(value) || 18 })}
      />
      <Field
        label="Возраст до"
        keyboardType="numeric"
        value={String(draft.ageMax)}
        onChangeText={(value) => setDraft({ ...draft, ageMax: Number(value) || 45 })}
      />
      <Field
        label="Радиус, км"
        keyboardType="numeric"
        value={String(draft.radius)}
        onChangeText={(value) => setDraft({ ...draft, radius: Number(value) || 25 })}
      />
      <Button label="Сохранить" onPress={() => onSave(draft)} />
    </Sheet>
  );
}

export function DiscoveryScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 860;
  const demoMode = useSessionStore((state) => state.demoMode);
  const [remotePeople, setRemotePeople] = useState<FeromeetUser[]>();
  const [error, setError] = useState('');
  const source = remotePeople?.length ? remotePeople : demoMode ? people : remotePeople ?? [];
  const [index, setIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [preference, setPreference] = useState<SearchPreference>({
    sex: 'ANY',
    ageMin: 18,
    ageMax: 45,
    radius: 25,
  });
  const person = source[index];
  const drag = useRef(new Animated.ValueXY()).current;
  const cardWidth = Math.min(width - 32, desktop ? 420 : width - 24);
  const cardHeight = desktop ? 520 : Math.min(width * 1.28, 620);

  const loadUsers = () => {
    if (demoMode) return;
    discoveryApi
      .getUsers()
      .then((users) => {
        if (Array.isArray(users)) setRemotePeople(users);
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'Не удалось загрузить анкеты');
      });
  };

  useEffect(() => {
    loadUsers();
    if (!demoMode) {
      discoveryApi.getPreference().then(setPreference).catch(() => undefined);
    }
  }, [demoMode]);

  useEffect(() => {
    setPhotoIndex(0);
    drag.setValue({ x: 0, y: 0 });
  }, [index, drag]);

  const skip = () => {
    if (!person) return;
    if (!demoMode) void discoveryApi.dislike(person.id).catch(() => undefined);
    setIndex((value) => value + 1);
  };

  const toggleFavorite = () => {
    if (!person) return;
    if (!demoMode) {
      void discoveryApi.favorite(person.id, !person.isFavorite).catch(() => undefined);
    }
    setRemotePeople((current) =>
      (current ?? (demoMode ? people : [])).map((item) =>
        item.id === person.id ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    );
  };

  const invite = async (expenseType: ExpenseType, ferotag: string, comment: string) => {
    if (!person) return;
    setBusy(true);
    setInviteError('');
    try {
      if (!demoMode) {
        await discoveryApi.invite({
          price: 0,
          expenseType,
          ferotag,
          comment: comment.trim() || 'Давай встретимся',
          userTo: person.id,
        });
      }
      setInviteOpen(false);
      setIndex((value) => value + 1);
    } catch (requestError) {
      setInviteError(
        requestError instanceof ApiError ? requestError.message : 'Не удалось отправить приглашение',
      );
    } finally {
      setBusy(false);
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
        onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 120 || gesture.vx > 0.8) {
            Animated.timing(drag, { toValue: { x: 420, y: 0 }, duration: 180, useNativeDriver: false }).start(
              () => setInviteOpen(true),
            );
          } else if (gesture.dx < -120 || gesture.vx < -0.8) {
            Animated.timing(drag, { toValue: { x: -420, y: 0 }, duration: 180, useNativeDriver: false }).start(
              skip,
            );
          } else {
            Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          }
        },
      }),
    [person, demoMode],
  );

  useEffect(() => {
    if (!desktop || typeof window === 'undefined') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (inviteOpen || filterOpen) {
        if (event.key === 'Escape') {
          setInviteOpen(false);
          setFilterOpen(false);
        }
        return;
      }
      if (event.key === 'ArrowLeft') skip();
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, Math.max(source.length - 1, 0)));
      if (event.key === 'Enter') setInviteOpen(true);
      if (event.key.toLowerCase() === 'f') toggleFavorite();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [desktop, inviteOpen, filterOpen, person, source.length]);

  if (!person) {
    return (
      <ScreenState
        kind={error ? 'error' : 'empty'}
        title={error ? 'Не удалось загрузить' : 'Вы всё посмотрели'}
        message={error || 'Новые анкеты появятся здесь совсем скоро.'}
        action={error ? loadUsers : undefined}
      />
    );
  }

  const photos = userPhotos(person);
  const nextPhoto = () => setPhotoIndex((value) => (photos.length ? (value + 1) % photos.length : 0));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BrandMark />
        <Pressable accessibilityLabel="Фильтры" onPress={() => setFilterOpen(true)} style={styles.filterButton}>
          <Text style={styles.filterIcon}>☰</Text>
        </Pressable>
      </View>

      {desktop ? (
        <ScrollView contentContainerStyle={styles.desktop} showsVerticalScrollIndicator={false}>
          <View style={styles.strip}>
            <Pressable onPress={skip} style={styles.stripArrow}><Text style={styles.stripArrowText}>‹</Text></Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripList}>
              {source.map((item, itemIndex) => (
                <Pressable
                  key={item.id}
                  onPress={() => setIndex(itemIndex)}
                  style={[styles.stripCard, itemIndex === index && styles.stripCardActive]}
                >
                  {photoUrl(item.mainSmallPhotoFilename || item.mainPhotoFilename) ? (
                    <Image
                      source={{ uri: photoUrl(item.mainSmallPhotoFilename || item.mainPhotoFilename) }}
                      style={styles.stripImage}
                    />
                  ) : (
                    <Avatar name={item.name} size={72} />
                  )}
                  <Text style={styles.stripName}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setIndex((value) => Math.min(value + 1, source.length - 1))}
              style={styles.stripArrow}
            >
              <Text style={styles.stripArrowText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.desktopDetail}>
            <DiscoveryCard
              person={person}
              width={cardWidth}
              height={cardHeight}
              photoIndex={photoIndex}
              onNextPhoto={nextPhoto}
            />
            <View style={styles.detailCopy}>
              <Text style={styles.about}>{person.textAbout || 'Пока без описания'}</Text>
              <ActionDock
                favorite={person.isFavorite}
                onSkip={skip}
                onGo={() => setInviteOpen(true)}
                onFavorite={toggleFavorite}
              />
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.mobile}>
          <Animated.View
            style={{ transform: drag.getTranslateTransform() }}
            {...pan.panHandlers}
          >
            <DiscoveryCard
              person={person}
              width={cardWidth}
              height={cardHeight}
              photoIndex={photoIndex}
              onNextPhoto={nextPhoto}
            />
          </Animated.View>
          <ActionDock
            favorite={person.isFavorite}
            onSkip={skip}
            onGo={() => setInviteOpen(true)}
            onFavorite={toggleFavorite}
          />
        </View>
      )}

      <InviteSheet
        person={person}
        visible={inviteOpen}
        busy={busy}
        error={inviteError}
        onClose={() => setInviteOpen(false)}
        onInvite={(expense, ferotag, comment) => void invite(expense, ferotag, comment)}
      />
      <FilterSheet
        visible={filterOpen}
        preference={preference}
        onClose={() => setFilterOpen(false)}
        onSave={(value) => {
          setPreference(value);
          setFilterOpen(false);
          if (!demoMode) void discoveryApi.savePreference(value).then(loadUsers);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  filterIcon: { color: colors.berry, fontSize: 22, fontWeight: '900' },
  mobile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingBottom: 12 },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
    ...shadow,
  },
  cardImage: { width: '100%', height: '100%' },
  cardFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A211C' },
  cardScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
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
  readyBadge: {
    position: 'absolute',
    top: 22,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardMeta: { position: 'absolute', left: 16, right: 16, bottom: 18, gap: 6 },
  cardName: { color: '#fff', fontSize: 28, fontWeight: '900' },
  onlineDot: { color: colors.green, fontSize: 16 },
  cardCity: { color: '#fff', fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  glassChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  glassChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  dockButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  dockSkip: { color: '#3B82F6', fontSize: 26, fontWeight: '900' },
  dockHeart: { color: colors.berry, fontSize: 18, fontWeight: '900' },
  dockHeartActive: { color: colors.berryDark },
  dockGo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  dockGoHeart: { color: '#fff', fontSize: 22, lineHeight: 24 },
  dockGoText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  desktop: { padding: spacing.lg, gap: spacing.lg },
  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stripList: { gap: spacing.sm, paddingVertical: 4 },
  stripCard: {
    width: 108,
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stripCardActive: { borderColor: colors.berry, backgroundColor: colors.soft },
  stripImage: { width: 72, height: 72, borderRadius: 36 },
  stripName: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  stripArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stripArrowText: { fontSize: 28, color: colors.berry, fontWeight: '900' },
  desktopDetail: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'center' },
  detailCopy: { flex: 1, minWidth: 280, gap: spacing.lg },
  about: { color: colors.ink, fontSize: 18, lineHeight: 26 },
  inviteBody: { gap: spacing.md, paddingBottom: spacing.md },
  sectionLabel: { color: colors.ink, fontWeight: '800' },
  expenseRow: { flexDirection: 'row', gap: 8 },
  expenseCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    justifyContent: 'center',
    gap: 4,
  },
  expenseCardActive: { ...gradient, borderColor: colors.berry },
  expenseTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  expenseSub: { color: colors.muted, fontSize: 11 },
  expenseTitleActive: { color: '#fff' },
  counter: { color: colors.muted, textAlign: 'right', fontSize: 12, marginTop: -8 },
  error: { color: colors.danger, fontSize: 13 },
});

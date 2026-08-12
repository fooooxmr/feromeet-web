import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ageFromBirthday,
  matchesSearchPreference,
  photoUrl,
  userPhotos,
  type ExpenseType,
  type FeromeetUser,
  type SearchPreference,
} from '../../domain/models';
import { FEROTAG_OPTIONS, formatTag, userChips } from '../../domain/tags';
import { people } from '../demo/fixtures';
import { Button, Chip, Field, HeartMark, Photo, ScreenState, Sheet, SliderField, TagChip } from '../../components/ui';
import { colors, fontFamily, gradient, radius, shadow, spacing } from '../../theme/tokens';
import { discoveryApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useSessionStore } from '../../state/session';
import { useShellStore } from '../../state/shell';
import { useIsDesktop } from '../../theme/layout';

const EXPENSE_OPTIONS: Array<{ type: ExpenseType; title: string; subtitle: string; icon: string }> = [
  { type: 'I_PAY', title: 'Я угощаю', subtitle: 'Всё включено', icon: '🤝' },
  { type: 'SPLIT', title: 'Пополам', subtitle: '50/50', icon: '🎟️' },
  { type: 'YOU_PAY', title: 'Угостишь меня?', subtitle: 'За твой счёт', icon: '🎁' },
];

function displayAge(person: FeromeetUser) {
  return ageFromBirthday(person.birthday);
}

function DiscoveryCard({
  person,
  onNextPhoto,
  photoIndex,
}: {
  person: FeromeetUser;
  onNextPhoto: () => void;
  photoIndex: number;
}) {
  const photos = userPhotos(person);
  const uri = photoUrl(photos[photoIndex] ?? photos[0] ?? person.mainPhotoFilename);
  const age = displayAge(person);
  const online = !person.lastSeen;
  const chips = userChips(person);

  return (
    <Pressable onPress={onNextPhoto} style={styles.card}>
      {uri ? (
        <Photo uri={uri} style={styles.cardImage} accessibilityLabel={person.name} />
      ) : (
        <View style={[styles.cardImage, styles.cardFallback]} />
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
        <Text style={styles.readyText}>{person.readyToGo ?? 0} %</Text>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardName} numberOfLines={1}>
        {person.name.trim()}{age ? `, ${age}` : ''}
          {online ? <Text style={styles.onlineDot}>  ●</Text> : null}
        </Text>
        <Text style={styles.cardCity}>
          {person.city ?? 'Рядом'}
          {person.rating != null ? `   ★  ${person.rating}` : ''}
        </Text>
        <View style={styles.tagRow}>
          {chips.map((tag) => (
            <TagChip key={tag.key || tag.label} tag={tag} glass />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function ProfileDetails({
  person,
  onInvite,
}: {
  person: FeromeetUser;
  onInvite?: () => void;
}) {
  const age = displayAge(person);
  const photos = userPhotos(person);
  const chips = userChips(person);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileBody}>
      <Text style={styles.profileName}>
        {person.name.trim()}
        {age ? `, ${age}` : ''}
      </Text>
      <Text style={styles.profileMeta}>
        {[person.city, person.height ? `${person.height} см` : undefined]
          .filter(Boolean)
          .join(' · ')}
        {person.rating != null ? `   ★  ${person.rating}` : ''}
      </Text>
      <Text style={styles.profileAbout}>{person.textAbout || 'Пока без описания'}</Text>
      <View style={styles.tagRow}>
        {chips.map((tag) => (
          <TagChip key={tag.key || tag.label} tag={tag} />
        ))}
      </View>
      {photos.length > 1 && (
        <View style={styles.photoStrip}>
          {photos.slice(0, 5).map((filename) => {
            const uri = photoUrl(filename);
            return uri ? (
              <Photo key={filename} uri={uri} style={styles.stripPhoto} accessibilityLabel={person.name} />
            ) : null;
          })}
        </View>
      )}
      {onInvite ? <Button label="Пригласить" onPress={onInvite} /> : null}
    </ScrollView>
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
      <Pressable accessibilityLabel="Пригласить" onPress={onGo} style={styles.dockGo}>
        <HeartMark size={72} label="GO" />
      </Pressable>
      <Pressable accessibilityLabel="В симпатии" onPress={onFavorite} style={styles.dockButton}>
        <Text style={[styles.dockHeart, favorite && styles.dockHeartActive]}>
          {favorite ? '♥♥' : '♡♡'}
        </Text>
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
  const tags = (person.ferotags?.length ? person.ferotags : FEROTAG_OPTIONS.map((tag) => tag.key)).map(formatTag);
  const [expense, setExpense] = useState<ExpenseType>('I_PAY');
  const [ferotag, setFerotag] = useState(tags[0]?.key ?? FEROTAG_OPTIONS[0]!.key);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setFerotag(tags[0]?.key ?? FEROTAG_OPTIONS[0]!.key);
    setComment('');
  }, [person.id]);

  return (
    <Sheet visible={visible} title="Пригласить" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inviteBody}>
        <Text style={styles.sectionLabel}>Участие в расходах</Text>
        <View style={styles.expenseRow}>
          {EXPENSE_OPTIONS.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => setExpense(option.type)}
              style={[styles.expenseCard, expense === option.type && styles.expenseCardActive]}
            >
              <Text style={styles.expenseIcon}>{option.icon}</Text>
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
            <Chip
              key={tag.key}
              label={tag.label}
              icon={tag.icon}
              active={ferotag === tag.key}
              onPress={() => setFerotag(tag.key)}
            />
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
      <SliderField
        label="Возраст от"
        min={18}
        max={45}
        value={draft.ageMin}
        onChange={(ageMin) => setDraft({ ...draft, ageMin: Math.min(ageMin, draft.ageMax) })}
      />
      <SliderField
        label="Возраст до"
        min={18}
        max={45}
        value={draft.ageMax}
        onChange={(ageMax) => setDraft({ ...draft, ageMax: Math.max(ageMax, draft.ageMin) })}
      />
      <SliderField
        label="Радиус"
        min={1}
        max={200}
        suffix=" км"
        value={draft.radius}
        onChange={(radius) => setDraft({ ...draft, radius })}
      />
      <Button label="Сохранить" onPress={() => onSave(draft)} />
    </Sheet>
  );
}

export function DiscoveryScreen() {
  const demoMode = useSessionStore((state) => state.demoMode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const desktop = useIsDesktop();
  const setOpenFilters = useShellStore((state) => state.setOpenFilters);
  const [remotePeople, setRemotePeople] = useState<FeromeetUser[]>();
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [preference, setPreference] = useState<SearchPreference>({
    sex: 'ANY',
    ageMin: 18,
    ageMax: 45,
    radius: 25,
  });
  const source = (demoMode ? people : remotePeople ?? []).filter((user) =>
    matchesSearchPreference(user, preference),
  );
  const person = source[index];
  const dragX = useRef(new Animated.Value(0)).current;
  const rotate = dragX.interpolate({
    inputRange: [-280, 0, 280],
    outputRange: ['-14deg', '0deg', '14deg'],
  });

  const loadUsers = () => {
    if (demoMode) return;
    setLoading(true);
    const apply = (users: FeromeetUser[]) => {
      setRemotePeople(Array.isArray(users) ? users : []);
      setIndex(0);
      setError('');
    };
    const fail = (requestError: unknown) => {
      setRemotePeople([]);
      setError(requestError instanceof ApiError ? requestError.message : 'Не удалось загрузить анкеты');
    };
    discoveryApi
      .getUsers()
      .then(apply)
      .catch((requestError) => {
        const status = requestError instanceof ApiError ? requestError.status : 0;
        if (status === 403 || status === 401) {
          return new Promise((resolve) => setTimeout(resolve, 400))
            .then(() => discoveryApi.getUsers())
            .then(apply)
            .catch(fail);
        }
        fail(requestError);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hydrated) return;
    loadUsers();
    if (!demoMode) {
      discoveryApi.getPreference().then(setPreference).catch(() => undefined);
    }
  }, [demoMode, hydrated]);

  useEffect(() => {
    setOpenFilters(() => setFilterOpen(true));
    return () => setOpenFilters(undefined);
  }, [setOpenFilters]);

  useLayoutEffect(() => {
    setPhotoIndex(0);
    setProfileOpen(false);
    dragX.setValue(0);
  }, [index, dragX]);

  const skip = () => {
    if (!person) return;
    if (!demoMode) void discoveryApi.dislike(person.id).catch(() => undefined);
    setIndex((value) => value + 1);
  };

  const like = () => {
    if (!person) return;
    if (!demoMode) void discoveryApi.like(person.id).catch(() => undefined);
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
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || (!desktop && Math.abs(gesture.dy) > 12),
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15) {
            dragX.setValue(0);
            return;
          }
          dragX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (!desktop && gesture.dy > 90 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
            Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start();
            setProfileOpen(true);
            return;
          }
          if (gesture.dx > 120 || gesture.vx > 0.8) {
            Animated.timing(dragX, { toValue: 520, duration: 180, useNativeDriver: false }).start(() => {
              like();
            });
          } else if (gesture.dx < -120 || gesture.vx < -0.8) {
            Animated.timing(dragX, { toValue: -520, duration: 180, useNativeDriver: false }).start(() => {
              skip();
            });
          } else {
            Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start();
          }
        },
      }),
    [desktop, person, demoMode],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (inviteOpen || filterOpen || profileOpen) {
        if (event.key === 'Escape') {
          setInviteOpen(false);
          setFilterOpen(false);
          setProfileOpen(false);
        }
        return;
      }
      if (event.key === 'ArrowLeft') skip();
      if (event.key === 'ArrowRight') like();
      if (event.key === 'Enter') setInviteOpen(true);
      if (event.key.toLowerCase() === 'f') toggleFavorite();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inviteOpen, filterOpen, profileOpen, person]);

  const card = person ? (
    <Animated.View
      key={person.id}
      style={[styles.cardWrap, { transform: [{ translateX: dragX }, { rotate }] }]}
      {...pan.panHandlers}
    >
      <DiscoveryCard
        person={person}
        photoIndex={photoIndex}
        onNextPhoto={() => {
          const photos = userPhotos(person);
          setPhotoIndex((value) => (photos.length ? (value + 1) % photos.length : 0));
        }}
      />
    </Animated.View>
  ) : null;

  const dock = person ? (
    <ActionDock
      favorite={person.isFavorite}
      onSkip={skip}
      onGo={() => setInviteOpen(true)}
      onFavorite={toggleFavorite}
    />
  ) : null;

  return (
    <View style={styles.screen}>
      {loading || !hydrated ? (
        <ScreenState kind="loading" title="Загружаем анкеты" message="Это займёт секунду" />
      ) : !person ? (
        <ScreenState
          kind={error ? 'error' : 'empty'}
          title={error ? 'Не удалось загрузить' : 'Вы всё посмотрели'}
          message={error || 'Новые анкеты появятся здесь совсем скоро.'}
          action={error ? loadUsers : undefined}
        />
      ) : desktop ? (
        <View style={styles.desktopBoard}>
          <View style={styles.desktopCardCol}>
            {card}
            {dock}
          </View>
          <View style={styles.desktopProfile}>
            <Text style={styles.profileKicker}>Профиль</Text>
            <ProfileDetails person={person} onInvite={() => setInviteOpen(true)} />
          </View>
        </View>
      ) : (
        <View style={styles.stack}>
          {card}
          {dock}
          <Pressable onPress={() => setProfileOpen(true)} style={styles.pullHint}>
            <Text style={styles.pullHintText}>Свайп вниз — профиль</Text>
          </Pressable>
        </View>
      )}

      {person && (
        <InviteSheet
          person={person}
          visible={inviteOpen}
          busy={busy}
          error={inviteError}
          onClose={() => setInviteOpen(false)}
          onInvite={(expense, ferotag, comment) => void invite(expense, ferotag, comment)}
        />
      )}
      {person && !desktop && (
        <Sheet visible={profileOpen} title={person.name.trim()} onClose={() => setProfileOpen(false)}>
          <ProfileDetails person={person} />
        </Sheet>
      )}
      <FilterSheet
        visible={filterOpen}
        preference={preference}
        onClose={() => setFilterOpen(false)}
        onSave={(value) => {
          setPreference(value);
          setFilterOpen(false);
          setIndex(0);
          if (!demoMode) void discoveryApi.savePreference(value).then(loadUsers);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  stack: { flex: 1, paddingHorizontal: 12, paddingBottom: 8, overflow: 'hidden' },
  cardWrap: { flex: 1 },
  desktopBoard: {
    flex: 1,
    flexDirection: 'row',
    padding: 28,
    gap: 28,
    backgroundColor: colors.stage,
  },
  desktopCardCol: {
    width: 400,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  desktopProfile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.canvas,
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line,
  },
  profileKicker: {
    color: colors.berry,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily,
  },
  profileBody: { gap: 12, paddingBottom: 24 },
  profileName: { color: colors.ink, fontSize: 32, fontWeight: '800', fontFamily },
  profileMeta: { color: colors.muted, fontWeight: '600', fontFamily },
  profileAbout: { color: colors.ink, fontSize: 16, lineHeight: 24, fontFamily },
  photoStrip: { flexDirection: 'row', gap: 8 },
  stripPhoto: { width: 72, height: 72, borderRadius: 16 },
  pullHint: { alignItems: 'center', paddingBottom: 4 },
  pullHintText: { color: colors.muted, fontSize: 12, fontFamily },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
    ...shadow,
  },
  cardImage: { ...StyleSheet.absoluteFill },
  cardFallback: { backgroundColor: '#2A211C' },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.35)',
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.72) 100%)',
      },
      default: {},
    }),
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
  readyText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily },
  cardMeta: { position: 'absolute', left: 16, right: 16, bottom: 78, gap: 6 },
  cardName: { color: '#fff', fontSize: 26, fontWeight: '800', fontFamily },
  onlineDot: { color: colors.green, fontSize: 14 },
  cardCity: { color: '#fff', fontWeight: '600', fontFamily },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  dockButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  dockSkip: { color: '#3B82F6', fontSize: 22, fontWeight: '800' },
  dockHeart: { color: colors.berry, fontSize: 18, fontWeight: '800' },
  dockHeartActive: { color: colors.berryDark },
  dockGo: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBody: { gap: spacing.md, paddingBottom: spacing.md },
  sectionLabel: { color: colors.ink, fontWeight: '700', fontFamily },
  expenseRow: { flexDirection: 'row', gap: 8 },
  expenseCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  expenseCardActive: { ...gradient, borderColor: colors.berry },
  expenseIcon: { fontSize: 18 },
  expenseTitle: { color: colors.ink, fontWeight: '700', fontSize: 12, textAlign: 'center', fontFamily },
  expenseSub: { color: colors.muted, fontSize: 11, textAlign: 'center', fontFamily },
  expenseTitleActive: { color: '#fff' },
  counter: { color: colors.muted, textAlign: 'right', fontSize: 12, marginTop: -8, fontFamily },
  error: { color: colors.danger, fontSize: 13, fontFamily },
});

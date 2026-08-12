import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { photoUrl, type FeromeetUser } from '../../domain/models';
import { people } from '../demo/fixtures';
import { Avatar, Button, Card, Chip, Field, Page, ScreenState, Sheet } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/tokens';
import { discoveryApi } from '../../api/endpoints';
import { useSessionStore } from '../../state/session';

function ProfileCard({
  person,
  onInvite,
  onSkip,
  onFavorite,
  detailed,
}: {
  person: FeromeetUser;
  onInvite: () => void;
  onSkip?: () => void;
  onFavorite?: () => void;
  detailed?: boolean;
}) {
  return (
    <Card>
      <View style={[styles.portrait, detailed && styles.portraitDetailed]}>
        <View style={styles.orbitOne} />
        <View style={styles.orbitTwo} />
        <Avatar
          name={person.name}
          size={detailed ? 116 : 96}
          uri={photoUrl(person.mainPhotoFilename)}
        />
        <View style={styles.ready}>
          <Text style={styles.readyText}>{person.readyToGo}% готова встретиться</Text>
        </View>
      </View>
      <View style={styles.profileBody}>
        <View style={styles.profileTitleRow}>
          <View>
            <Text style={styles.profileName}>{person.name}, 27</Text>
            <Text style={styles.profileMeta}>
              {person.city} · {person.height} см · ★ {person.rating}
            </Text>
          </View>
          <Pressable onPress={onFavorite} style={styles.heart}>
            <Text style={styles.heartText}>{person.isFavorite ? '♥' : '♡'}</Text>
          </Pressable>
        </View>
        <Text style={styles.about}>{person.textAbout}</Text>
        <View style={styles.chips}>
          {person.ferotags?.map((tag) => <Chip key={tag} label={tag} />)}
        </View>
        <View style={styles.actions}>
          {onSkip && <Button label="Не сейчас" variant="ghost" onPress={onSkip} />}
          <View style={styles.actionPrimary}>
            <Button label="Пригласить на встречу" onPress={onInvite} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function InviteSheet({
  person,
  visible,
  onClose,
  onInvite,
}: {
  person: FeromeetUser;
  visible: boolean;
  onClose: () => void;
  onInvite: (budget: number, split: string, comment: string) => void;
}) {
  const [budget, setBudget] = useState('120');
  const [split, setSplit] = useState('Поровну');
  const [comment, setComment] = useState('');
  const valid = Number(budget) >= 10;

  return (
    <Sheet visible={visible} onClose={onClose} title={`Пригласить ${person.name}`}>
      <Text style={styles.sheetLead}>
        Предложите понятный план — детали всегда можно уточнить в чате.
      </Text>
      <Field
        label="Бюджет, BYN"
        keyboardType="numeric"
        value={budget}
        onChangeText={setBudget}
      />
      {!valid && <Text style={styles.validation}>Минимальный бюджет — 10 BYN</Text>}
      <Text style={styles.fieldLikeLabel}>Как разделим расходы</Text>
      <View style={styles.chips}>
        {['Я угощаю', 'Поровну', 'Партнёр'].map((value) => (
          <Chip key={value} label={value} active={split === value} onPress={() => setSplit(value)} />
        ))}
      </View>
      <Field
        label="Идея встречи"
        multiline
        placeholder="Например: кофе и вечерняя прогулка"
        value={comment}
        onChangeText={setComment}
      />
      <Button
        disabled={!valid}
        label="Отправить приглашение"
        onPress={() => onInvite(Number(budget), split, comment)}
      />
      <Text style={styles.disclaimer}>Деньги не списываются — это ориентир для встречи.</Text>
    </Sheet>
  );
}

export function DiscoveryScreen({ favourites = false }: { favourites?: boolean }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 1080;
  const demoMode = useSessionStore((state) => state.demoMode);
  const [remotePeople, setRemotePeople] = useState<FeromeetUser[]>();
  const source = useMemo(() => {
    const available = remotePeople?.length ? remotePeople : people;
    return favourites ? available.filter((item) => item.isFavorite) : available;
  }, [favourites, remotePeople]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const person = source[favourites ? selected : index];

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    discoveryApi.getUsers()
      .then((users) => {
        if (active && Array.isArray(users)) setRemotePeople(users);
      })
      .catch(() => {
        // Local fixtures intentionally keep discovery usable during API contract confirmation.
      });
    return () => {
      active = false;
    };
  }, [demoMode]);

  const toggleFavorite = () => {
    if (!person) return;
    if (!demoMode) {
      void discoveryApi.favorite(person.id, !person.isFavorite).catch(() => undefined);
    }
    setRemotePeople((current) =>
      (current ?? people).map((item) =>
        item.id === person.id
          ? { ...item, isFavorite: !item.isFavorite }
          : item,
      ),
    );
  };

  const skip = () => {
    if (!person) return;
    if (!demoMode) void discoveryApi.dislike(person.id).catch(() => undefined);
    setIndex((value) => value + 1);
  };

  const invite = (budget: number, split: string, comment: string) => {
    if (!person) return;
    const expenseType = split === 'Поровну' ? 'HALF' : split === 'Я угощаю' ? 'HUNTER' : 'VICTIM';
    if (!demoMode) {
      void discoveryApi.like(person.id).catch(() => undefined);
      void discoveryApi.invite({
        price: budget,
        expenseType,
        ferotag: person.ferotags?.[0] ?? 'Встреча',
        comment: comment.trim() || 'Давайте познакомимся лично',
        userTo: person.id,
      }).catch(() => undefined);
    }
    setInviteOpen(false);
  };

  if (!person) {
    return (
      <ScreenState
        kind="empty"
        title={favourites ? 'Пока никого' : 'Вы всё посмотрели'}
        message={favourites ? 'Добавляйте людей в избранное, чтобы вернуться к ним позже.' : 'Новые анкеты появятся здесь совсем скоро.'}
      />
    );
  }

  return (
    <>
      <Page
        eyebrow={favourites ? 'Ваш выбор' : 'Сегодня рядом'}
        title={favourites ? 'Избранное' : 'Найдите своего человека'}
        subtitle={favourites ? `${source.length} профиля ждут вашего решения` : 'Не торопитесь. Хорошее совпадение чувствуется в деталях.'}
        action={!favourites ? <Button label="Фильтры" variant="secondary" /> : undefined}
      >
        {favourites && desktop ? (
          <View style={styles.desktopSplit}>
            <View style={styles.list}>
              {source.map((item, itemIndex) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelected(itemIndex)}
                  style={[styles.listRow, selected === itemIndex && styles.listRowActive]}
                >
                  <Avatar name={item.name} uri={photoUrl(item.mainSmallPhotoFilename)} />
                  <View style={styles.listCopy}>
                    <Text style={styles.listName}>{item.name}</Text>
                    <Text style={styles.listMeta}>{item.city} · {item.ferotags?.[0]}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.detail}>
              <ProfileCard person={person} detailed onInvite={() => setInviteOpen(true)} />
            </View>
          </View>
        ) : (
          <View style={styles.cardBound}>
            <ProfileCard
              person={person}
              onSkip={favourites ? undefined : skip}
              onFavorite={toggleFavorite}
              onInvite={() => setInviteOpen(true)}
            />
            {!favourites && (
              <Pressable onPress={() => router.push(`/profile/${person.id}`)} style={styles.more}>
                <Text style={styles.moreText}>Открыть полный профиль →</Text>
              </Pressable>
            )}
          </View>
        )}
      </Page>
      <InviteSheet
        person={person}
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={invite}
      />
    </>
  );
}

const styles = StyleSheet.create({
  portrait: {
    height: 240,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#E9CDC5',
  },
  portraitDetailed: { height: 290 },
  orbitOne: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 45,
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 125,
    top: -75,
    right: -65,
  },
  orbitTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(158,49,82,0.12)',
    left: -38,
    bottom: -45,
  },
  ready: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  readyText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  profileBody: { paddingTop: spacing.lg, gap: spacing.md },
  profileTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileName: { color: colors.ink, fontWeight: '900', fontSize: 26 },
  profileMeta: { color: colors.muted, marginTop: 4 },
  heart: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: { color: colors.berry, fontSize: 24 },
  about: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionPrimary: { flex: 1 },
  cardBound: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: spacing.md },
  more: { alignSelf: 'center', padding: spacing.sm },
  moreText: { color: colors.berry, fontWeight: '800' },
  desktopSplit: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  list: { width: 300, gap: spacing.sm },
  listRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  listRowActive: { borderColor: colors.berry, backgroundColor: colors.blush },
  listCopy: { flex: 1 },
  listName: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  listMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  chevron: { color: colors.berry, fontSize: 24 },
  detail: { flex: 1 },
  sheetLead: { color: colors.muted, lineHeight: 21 },
  fieldLikeLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  validation: { color: colors.danger, fontSize: 12, marginTop: -10 },
  disclaimer: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});

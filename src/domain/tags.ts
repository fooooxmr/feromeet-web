import type { FeromeetUser } from './models';

export interface TagView {
  key: string;
  label: string;
  icon: string;
}

const FEROTAGS: Record<string, TagView> = {
  ferotag_first_date: { key: 'ferotag_first_date', label: 'Первое свидание', icon: '💐' },
  ferotag_alone_with_tarantino: { key: 'ferotag_alone_with_tarantino', label: 'Наедине с Тарантино', icon: '🍿' },
  ferotag_guest_at_the_stove: { key: 'ferotag_guest_at_the_stove', label: 'Гость у плиты', icon: '🍳' },
  ferotag_like_a_breeze: { key: 'ferotag_like_a_breeze', label: 'Как ветерок', icon: '🍃' },
  ferotag_a_night_out: { key: 'ferotag_a_night_out', label: 'Ночной выход', icon: '🌙' },
  ferotag_a_freudian_slip: { key: 'ferotag_a_freudian_slip', label: 'Оговорка по Фрейду', icon: '💬' },
  ferotag_between_the_lines: { key: 'ferotag_between_the_lines', label: 'Между строк', icon: '📖' },
  ferotag_meeting_spot_is_fitting_room: {
    key: 'ferotag_meeting_spot_is_fitting_room',
    label: 'Примерочная',
    icon: '👗',
  },
  ferotag_i_never_bail_early_from_the_bar: {
    key: 'ferotag_i_never_bail_early_from_the_bar',
    label: 'Не сваливаю из бара',
    icon: '🍸',
  },
  ferotag_home_gathering: { key: 'ferotag_home_gathering', label: 'Квартирник', icon: '🏠' },
};

const INTERESTS: Record<string, TagView> = {
  inter_sports: { key: 'inter_sports', label: 'Спорт', icon: '🏅' },
  inter_travel: { key: 'inter_travel', label: 'Путешествия', icon: '✈️' },
  inter_pets: { key: 'inter_pets', label: 'Питомцы', icon: '🐾' },
  inter_read: { key: 'inter_read', label: 'Чтение', icon: '📚' },
  inter_dance: { key: 'inter_dance', label: 'Танцы', icon: '💃' },
  inter_music: { key: 'inter_music', label: 'Музыка', icon: '🎵' },
  inter_tourism: { key: 'inter_tourism', label: 'Туризм', icon: '🗺️' },
  inter_bake: { key: 'inter_bake', label: 'Выпечка', icon: '🥐' },
  inter_photo: { key: 'inter_photo', label: 'Фото', icon: '📷' },
  inter_music_instrum: { key: 'inter_music_instrum', label: 'Инструменты', icon: '🎸' },
  inter_collect: { key: 'inter_collect', label: 'Коллекции', icon: '🧸' },
  inter_fish: { key: 'inter_fish', label: 'Рыбалка', icon: '🎣' },
  inter_paint: { key: 'inter_paint', label: 'Рисование', icon: '🎨' },
  inter_binge_watch: { key: 'inter_binge_watch', label: 'Сериалы', icon: '📺' },
  inter_lang: { key: 'inter_lang', label: 'Языки', icon: '🗣️' },
  inter_cook: { key: 'inter_cook', label: 'Готовка', icon: '👨‍🍳' },
  inter_game: { key: 'inter_game', label: 'Игры', icon: '🎮' },
  inter_movie: { key: 'inter_movie', label: 'Кино', icon: '🎬' },
  inter_bodybuild: { key: 'inter_bodybuild', label: 'Бодибилдинг', icon: '💪' },
  inter_cycle: { key: 'inter_cycle', label: 'Вело', icon: '🚴' },
  inter_jogg: { key: 'inter_jogg', label: 'Бег', icon: '🏃' },
};

const BY_LABEL = Object.values({ ...FEROTAGS, ...INTERESTS }).reduce<Record<string, TagView>>(
  (acc, tag) => {
    acc[tag.label.toLowerCase()] = tag;
    acc[tag.key.replace(/^ferotag_|^inter_/, '').replaceAll('_', ' ')] = tag;
    return acc;
  },
  {},
);

export const FEROTAG_OPTIONS = Object.values(FEROTAGS);

export function formatTag(raw?: string): TagView {
  const value = (raw ?? '').trim();
  if (!value) return { key: '', label: '', icon: '✦' };
  const direct = FEROTAGS[value] ?? INTERESTS[value];
  if (direct) return direct;
  const lower = value.toLowerCase();
  const named = BY_LABEL[lower];
  if (named) return named;
  if (value.startsWith('ferotag_') || value.startsWith('inter_')) {
    return {
      key: value,
      label: value.replace(/^(ferotag_|inter_)/, '').replaceAll('_', ' '),
      icon: '✦',
    };
  }
  return { key: value, label: value, icon: '✦' };
}

export function formatTagLabel(raw?: string) {
  return formatTag(raw).label;
}

export function userChips(user: Pick<FeromeetUser, 'ferotags' | 'infotagCategories'>): TagView[] {
  const interests = (user.infotagCategories ?? [])
    .flatMap((category) =>
      (category.infotags ?? []).map((item) =>
        formatTag(typeof item === 'string' ? item : item.name ?? item.title),
      ),
    )
    .filter((tag) => tag.label);
  if (interests.length) return interests.slice(0, 4);
  return (user.ferotags ?? []).map(formatTag).filter((tag) => tag.label).slice(0, 4);
}

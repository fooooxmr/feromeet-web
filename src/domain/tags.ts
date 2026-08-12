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

const INFOTAGS: Record<string, TagView> = {
  ...INTERESTS,
  alco_socially: { key: 'alco_socially', label: 'Алкоголь социально', icon: '🍷' },
  alco_never: { key: 'alco_never', label: 'Не пью', icon: '🚫' },
  alco_often: { key: 'alco_often', label: 'Пью часто', icon: '🍷' },
  alco_sometimes: { key: 'alco_sometimes', label: 'Иногда пью', icon: '🍷' },
  alco_abstain: { key: 'alco_abstain', label: 'Отказываюсь от алкоголя', icon: '🚫' },
  person_extrovert: { key: 'person_extrovert', label: 'Экстраверт', icon: '☀️' },
  person_introvert: { key: 'person_introvert', label: 'Интроверт', icon: '🌙' },
  person_ambivert: { key: 'person_ambivert', label: 'Амбиверт', icon: '🌗' },
  occup_design: { key: 'occup_design', label: 'Дизайн', icon: '✏️' },
  occup_it: { key: 'occup_it', label: 'IT', icon: '💻' },
  occup_medicine: { key: 'occup_medicine', label: 'Медицина', icon: '🩺' },
  occup_education: { key: 'occup_education', label: 'Образование', icon: '🎓' },
  occup_marketing: { key: 'occup_marketing', label: 'Маркетинг', icon: '📣' },
  occup_sales: { key: 'occup_sales', label: 'Продажи', icon: '🤝' },
  occup_business: { key: 'occup_business', label: 'Бизнес', icon: '💼' },
  occup_law: { key: 'occup_law', label: 'Юриспруденция', icon: '⚖️' },
  occup_beauty: { key: 'occup_beauty', label: 'Красота', icon: '💅' },
  occup_journalism: { key: 'occup_journalism', label: 'Журналистика', icon: '📰' },
  occup_science: { key: 'occup_science', label: 'Наука', icon: '🔬' },
  occup_psychology: { key: 'occup_psychology', label: 'Психология', icon: '🧠' },
  occup_economy: { key: 'occup_economy', label: 'Экономика', icon: '📈' },
  occup_politics: { key: 'occup_politics', label: 'Политика', icon: '🏛' },
  occup_industry: { key: 'occup_industry', label: 'Производство', icon: '🏭' },
  occup_banking: { key: 'occup_banking', label: 'Банки', icon: '🏦' },
  occup_logistics: { key: 'occup_logistics', label: 'Логистика', icon: '🚚' },
  english: { key: 'english', label: 'English', icon: '🇬🇧' },
  russian: { key: 'russian', label: 'Русский', icon: '🇷🇺' },
  german: { key: 'german', label: 'Deutsch', icon: '🇩🇪' },
  french: { key: 'french', label: 'Français', icon: '🇫🇷' },
  spanish: { key: 'spanish', label: 'Español', icon: '🇪🇸' },
  chinese: { key: 'chinese', label: '中文', icon: '🇨🇳' },
  portuguese: { key: 'portuguese', label: 'Português', icon: '🇵🇹' },
  arab: { key: 'arab', label: 'العربية', icon: '🇸🇦' },
};

const BY_LABEL = Object.values({ ...FEROTAGS, ...INFOTAGS }).reduce<Record<string, TagView>>(
  (acc, tag) => {
    acc[tag.label.toLowerCase()] = tag;
    acc[tag.key.replace(/^ferotag_|^inter_/, '').replaceAll('_', ' ')] = tag;
    return acc;
  },
  {},
);

export const FEROTAG_OPTIONS = Object.values(FEROTAGS);

export function formatTag(raw?: string): TagView {
  const value = (raw ?? '').trim().replace(/^\+\s*/, '');
  if (!value) return { key: '', label: '', icon: '✦' };
  const direct = FEROTAGS[value] ?? INFOTAGS[value] ?? INTERESTS[value];
  if (direct) return direct;
  const lower = value.toLowerCase();
  const named = BY_LABEL[lower];
  if (named) return named;
  if (/^(ferotag_|inter_|alco_|occup_|person_)/.test(value) || value.includes('_')) {
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
  const all = (user.infotagCategories ?? []).flatMap((category) =>
    (category.infotags ?? []).map((item) =>
      typeof item === 'string' ? item : item.name ?? item.title ?? '',
    ),
  );
  const seen = new Set<string>();
  return [...(user.ferotags ?? []), ...all]
    .map(formatTag)
    .filter((tag) => {
      if (!tag.label || seen.has(tag.key) || seen.has(tag.label)) return false;
      seen.add(tag.key);
      seen.add(tag.label);
      return true;
    })
    .slice(0, 4);
}

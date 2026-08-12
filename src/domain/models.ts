export type RegistrationStatus =
  | 'REGISTERED'
  | 'PROFILE_REQUIRED'
  | 'REGISTERED_PHONE_VERIFIED'
  | 'NOT_REGISTERED_PHONE_ENTERED'
  | 'REGISTERED_PROFILE_FILLED'
  | 'NONE'
  | string;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  registrationStatus: RegistrationStatus;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
  errorCode?: string;
  status?: number;
  timestamp?: string;
}

export interface InfoTagCategory {
  name?: string;
  title?: string;
  infotags?: Array<string | { name?: string; title?: string }>;
}

export interface ImpressionTag {
  name?: string;
  title?: string;
  count?: number;
}

export interface FeromeetUser {
  id: string;
  name: string;
  city?: string;
  birthday?: string;
  gender?: string;
  interestedIn?: string;
  readyToGo?: number;
  height?: number;
  rating?: number;
  lastSeen?: string;
  ferotags?: string[];
  infotagCategories?: InfoTagCategory[];
  impressionTags?: ImpressionTag[];
  mainPhotoFilename?: string;
  mainSmallPhotoFilename?: string;
  otherPhotoFilenames?: string[];
  textAbout?: string;
  isFavorite?: boolean;
}

export interface SearchPreference {
  sex: string;
  ageMin: number;
  ageMax: number;
  radius: number;
}

export type ExpenseType = 'I_PAY' | 'SPLIT' | 'YOU_PAY' | string;

export interface InviteRequest {
  price: number;
  ferotag: string;
  expenseType: ExpenseType;
  comment: string;
  userTo: string;
}

export interface RateMeetRequest {
  meetId: number;
  score: number;
  comment: string;
  impressionTags: string[];
}

export interface ReactionUser extends FeromeetUser {
  reactionType?: 'LIKE' | 'FAVORITE' | string;
}

export interface MeetStage {
  type?: string;
  status?: string;
  title?: string;
  subtitle?: string;
  dateTime?: string;
  completed?: boolean;
}

export interface Meet {
  meetId: number;
  chatId: string;
  price?: number;
  ferotag?: string;
  expenseType?: string;
  status: string;
  isYouHunter: boolean;
  isRated: boolean;
  score?: number;
  isCancelled: boolean;
  hasUpdates: boolean;
  countUnreadMessages: number;
  createdAt: string;
  stages: MeetStage[];
  lastSeen?: string;
  user: FeromeetUser;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  chatId: string;
  createdAt: string;
  status?: string;
}

export const PHOTO_BASE_URL =
  'https://storage.yandexcloud.net/feromeet-bucket/photos/';

export function photoUrl(filename?: string): string | undefined {
  return filename ? `${PHOTO_BASE_URL}${encodeURIComponent(filename)}` : undefined;
}

export function ageFromBirthday(birthday?: string): number | undefined {
  if (!birthday) return undefined;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
}

export function userPhotos(user: FeromeetUser): string[] {
  return [user.mainPhotoFilename, ...(user.otherPhotoFilenames ?? [])].filter(
    (filename): filename is string => Boolean(filename),
  );
}

export function needsProfile(status?: string) {
  return (
    status === 'PROFILE_REQUIRED' ||
    status === 'REGISTERED_PHONE_VERIFIED' ||
    status === 'NOT_REGISTERED_PHONE_ENTERED'
  );
}

export function belarusLocalDigits(raw: string) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('375')) digits = digits.slice(3);
  else if (digits.startsWith('80') && digits.length >= 11) digits = digits.slice(2);
  return digits.slice(0, 9);
}

export function formatBelarusPhoneMask(raw: string) {
  const digits = belarusLocalDigits(raw);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(' ');
}

export function normalizePhone(raw: string) {
  const local = belarusLocalDigits(raw);
  return local ? `+375${local}` : '';
}

export function matchesSearchPreference(user: FeromeetUser, preference: SearchPreference) {
  const age = ageFromBirthday(user.birthday);
  if (age != null && (age < preference.ageMin || age > preference.ageMax)) return false;
  if (preference.sex && preference.sex !== 'ANY') {
    const gender = (user.gender || '').toUpperCase();
    if (gender && gender !== preference.sex.toUpperCase()) return false;
  }
  return true;
}

const LIST_KEYS = ['data', 'content', 'items', 'messages', 'result', 'body'] as const;

export function unwrapList<T>(payload: unknown, depth = 0): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object' || depth > 4) return [];
  const record = payload as Record<string, unknown>;
  for (const key of LIST_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }
  for (const key of LIST_KEYS) {
    const value = record[key];
    if (value && typeof value === 'object') {
      const nested = unwrapList<T>(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

function scalarId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
    return String((value as { id?: unknown }).id ?? '');
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function timestamp(value: unknown): string {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value > 1e12 ? value : value * 1000).toISOString();
  }
  if (Array.isArray(value) && typeof value[0] === 'number') {
    const year = value[0];
    const month = typeof value[1] === 'number' ? value[1] : 1;
    const day = typeof value[2] === 'number' ? value[2] : 1;
    const hour = typeof value[3] === 'number' ? value[3] : 0;
    const minute = typeof value[4] === 'number' ? value[4] : 0;
    const second = typeof value[5] === 'number' ? value[5] : 0;
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
  }
  return '';
}

const STAGE_TITLES: Record<string, string> = {
  STAGE_1: 'Приглашение',
  STAGE_2: 'Переписка',
  STAGE_3: 'Встреча',
};

const LINE_TITLES: Record<string, string> = {
  S1_INVITATION_HAS_SENT: 'Приглашение отправлено',
  S1_INVITATION_HAS_ACCEPTED_BY_VICTIM: 'Приглашение принято',
  S1_INVITATION_HAS_CREATED: 'Встреча создана',
  S2_CAN_CHAT_WITH_USER: 'Можно писать в чат',
  S2_AGREEING_MEETING_DETAILS: 'Согласуйте детали',
  S2_CONSENT_OBTAINED_FROM_VICTIM: 'Детали подтверждены',
  S2_WAITING_CONSENT_FROM_OTHER: 'Ждём подтверждение',
  S2_CONSENT_OBTAINED_FROM_HUNTER: 'Детали подтверждены',
  S3_MEET_WILL_START_SOON: 'Встреча скоро начнётся',
  S3_ARRIVAL_OBTAINED_FROM_VICTIM: 'Приход подтверждён',
  S3_ARRIVAL_OBTAINED_FROM_HUNTER: 'Приход подтверждён',
  S3_MEET_HAS_BEGUN: 'Встреча началась',
  S3_MEETING_FINISHED: 'Встреча завершена',
};

function stageTitle(name?: string, index = 0) {
  if (!name) return ['Приглашение', 'Переписка', 'Встреча'][index] ?? `Этап ${index + 1}`;
  return STAGE_TITLES[name] ?? STAGE_TITLES[`STAGE_${index + 1}`] ?? name;
}

function lineTitle(name?: string) {
  if (!name) return '';
  return LINE_TITLES[name] ?? '';
}

export function normalizeMeet(raw: Meet | Record<string, unknown>): Meet {
  const record = raw as Record<string, unknown>;
  const stages = ((raw as Meet).stages ?? []).map((stage, index) => {
    const item = stage as MeetStage & {
      name?: string;
      isOpen?: boolean;
      lines?: Array<{ name?: string; createdAt?: string; isCurrent?: boolean }>;
    };
    const name = item.name || item.type;
    const status = (item.status || '').toUpperCase();
    const lines = item.lines ?? [];
    const current = lines.find((line) => line.isCurrent) ?? lines.at(-1);
    return {
      type: name,
      status,
      title: item.title || stageTitle(name, index),
      subtitle:
        item.subtitle ||
        lineTitle(current?.name) ||
        (status === 'DONE' ? 'Готово' : status === 'CURRENT' ? 'Сейчас' : 'Скоро'),
      dateTime: item.dateTime || current?.createdAt,
      completed: item.completed ?? status === 'DONE',
    };
  });
  const meetIdValue = record.meetId ?? record.id;
  const meetId = typeof meetIdValue === 'number' ? meetIdValue : Number(meetIdValue);
  const user = (record.user ?? record.otherUser ?? record.partner) as Meet['user'];
  return {
    ...(raw as Meet),
    stages,
    chatId: scalarId(record.chatId ?? record.chat) || (raw as Meet).chatId,
    meetId: Number.isFinite(meetId) ? meetId : (raw as Meet).meetId,
    user: user || (raw as Meet).user,
  };
}

export function normalizeMeets(payload: unknown): Meet[] {
  return unwrapList<Meet>(payload).map((item) => normalizeMeet(item));
}

export function normalizeChatMessage(raw: unknown): ChatMessage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const nested =
    record.message && typeof record.message === 'object'
      ? (record.message as Record<string, unknown>)
      : record;
  const content = String(nested.content ?? nested.text ?? nested.message ?? record.content ?? '');
  const id = scalarId(nested.id ?? record.id);
  if (!id && !content) return undefined;
  const createdAt =
    timestamp(nested.createdAt ?? nested.timestamp ?? record.createdAt ?? record.timestamp) ||
    new Date().toISOString();
  return {
    id: id || `msg-${createdAt}`,
    senderId: scalarId(nested.senderId ?? nested.fromUserId ?? nested.from ?? nested.sender),
    recipientId: scalarId(
      nested.recipientId ?? nested.toUserId ?? nested.to ?? nested.recipient,
    ),
    content,
    chatId: scalarId(nested.chatId ?? record.chatId),
    createdAt,
    status: nested.status != null ? String(nested.status) : undefined,
  };
}

export function normalizeChatMessages(payload: unknown): ChatMessage[] {
  return unwrapList(payload)
    .map(normalizeChatMessage)
    .filter((item): item is ChatMessage => Boolean(item))
    .sort(
      (left, right) =>
        (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0),
    );
}

export function unwrapReactions(payload: unknown): ReactionUser[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => {
    if (item && typeof item === 'object' && 'user' in item) {
      const row = item as {
        user: FeromeetUser;
        isFavorite?: boolean;
        isLikeYou?: boolean;
      };
      return {
        ...row.user,
        isFavorite: row.isFavorite,
        reactionType: row.isFavorite ? 'FAVORITE' : 'LIKE',
      };
    }
    return item as ReactionUser;
  });
}

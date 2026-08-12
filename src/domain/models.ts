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

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      messages?: unknown;
      result?: unknown;
    };
    for (const value of [record.data, record.content, record.items, record.messages, record.result]) {
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
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
  const stages = ((raw as Meet).stages ?? []).map((stage, index) => {
    const record = stage as MeetStage & {
      name?: string;
      isOpen?: boolean;
      lines?: Array<{ name?: string; createdAt?: string; isCurrent?: boolean }>;
    };
    const name = record.name || record.type;
    const status = (record.status || '').toUpperCase();
    const lines = record.lines ?? [];
    const current = lines.find((line) => line.isCurrent) ?? lines.at(-1);
    return {
      type: name,
      status,
      title: record.title || stageTitle(name, index),
      subtitle:
        record.subtitle ||
        lineTitle(current?.name) ||
        (status === 'DONE' ? 'Готово' : status === 'CURRENT' ? 'Сейчас' : 'Скоро'),
      dateTime: record.dateTime || current?.createdAt,
      completed: record.completed ?? status === 'DONE',
    };
  });
  return { ...(raw as Meet), stages };
}

export function normalizeMeets(payload: unknown): Meet[] {
  return unwrapList<Meet>(payload).map((item) => normalizeMeet(item));
}

export function normalizeChatMessage(raw: unknown): ChatMessage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const content = String(record.content ?? record.text ?? record.message ?? '');
  const id = String(record.id ?? '');
  if (!id && !content) return undefined;
  return {
    id: id || `msg-${record.createdAt ?? Date.now()}`,
    senderId: String(record.senderId ?? record.fromUserId ?? record.from ?? ''),
    recipientId: String(record.recipientId ?? record.toUserId ?? record.to ?? ''),
    content,
    chatId: String(record.chatId ?? ''),
    createdAt: String(record.createdAt ?? record.timestamp ?? new Date().toISOString()),
    status: record.status ? String(record.status) : undefined,
  };
}

export function normalizeChatMessages(payload: unknown): ChatMessage[] {
  return unwrapList(payload)
    .map(normalizeChatMessage)
    .filter((item): item is ChatMessage => Boolean(item))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
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

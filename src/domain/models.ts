export type RegistrationStatus = 'REGISTERED' | 'PROFILE_REQUIRED' | string;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  registrationStatus: RegistrationStatus;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
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

export interface ReactionUser extends FeromeetUser {
  reactionType?: 'LIKE' | 'FAVORITE' | string;
}

export interface MeetStage {
  type?: string;
  status?: string;
  title?: string;
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

import { apiRequest, queryString } from '../client';
import type {
  AuthTokens,
  ChatMessage,
  FeromeetUser,
  InviteRequest,
  Meet,
  SearchPreference,
} from '../../domain/models';

const post = <T>(path: string, body?: unknown, auth = true) =>
  apiRequest<T>(path, { method: 'POST', body, auth });

export const authApi = {
  requestSms: (phoneNumber: string, mode: 'login' | 'registration' = 'login') =>
    post<void>(`/api/auth/${mode}/request-sms`, { phoneNumber }, false),

  loginWithSms: (phoneNumber: string, smsCode: string) =>
    post<AuthTokens>(
      '/api/auth/login/login-with-sms',
      { phoneNumber, smsCode },
      false,
    ),

  registerWithSms: (phoneNumber: string, smsCode: string) =>
    post<AuthTokens>(
      '/api/auth/registration/register-with-sms',
      { phoneNumber, smsCode },
      false,
    ),
};

export const discoveryApi = {
  getUsers: () => apiRequest<FeromeetUser[]>('/api/user/get-all-users'),

  getUser: (userId: string) =>
    apiRequest<FeromeetUser>(
      `/api/user/get-by-id${queryString({ userId })}`,
    ),

  getPreference: () =>
    apiRequest<SearchPreference>('/api/user/get-search-preference'),

  savePreference: (preference: SearchPreference) =>
    post<void>('/api/user/save/search-preference', preference),

  like: (userIdTo: string) =>
    post<void>('/api/reaction/add-like', { userIdTo }),

  dislike: (userIdTo: string) =>
    post<void>('/api/reaction/add-dislike', { userIdTo }),

  favorite: (userIdTo: string, favorite = true) =>
    post<void>(
      favorite
        ? '/api/reaction/add-favorite'
        : '/api/reaction/remove-favorite',
      { userIdTo },
    ),

  getFavorites: () =>
    apiRequest<unknown[]>('/api/reaction/get-all-reactions'),

  invite: (request: InviteRequest) =>
    post<void>('/api/meet/invite', request),
};

const meetAction = (path: string, meetId: number) =>
  post<void>(`/api/meet/${path}`, { meetId });

export const meetsApi = {
  getActive: () => apiRequest<Meet[]>('/api/meet/get-active-meets'),
  getPassed: () => apiRequest<Meet[]>('/api/meet/get-passed-meets'),
  getById: (meetId: number) =>
    apiRequest<Meet>(`/api/meet/get-by-id${queryString({ meetId })}`),
  accept: (meetId: number) =>
    meetAction('stage1/accept-by-victim', meetId),
  consentAsHunter: (meetId: number) =>
    meetAction('stage2/consent-from-hunter', meetId),
  consentAsVictim: (meetId: number) =>
    meetAction('stage2/consent-from-victim', meetId),
  arriveAsHunter: (meetId: number) =>
    meetAction('stage3/arrival-from-hunter', meetId),
  arriveAsVictim: (meetId: number) =>
    meetAction('stage3/arrival-from-victim', meetId),
  cancel: (meetId: number) => meetAction('cancel', meetId),
  markAsRead: (meetId: number) => meetAction('mark-as-read', meetId),
  hide: (meetId: number) => meetAction('hide', meetId),
  rate: (
    payload: Record<string, unknown> & { meetId: number },
  ) => post<void>('/api/meet/rate', payload),
};

export const chatApi = {
  getHistory: (chatId: string) =>
    apiRequest<ChatMessage[]>(
      `/api/meet/api/chat/get-history${queryString({ chatId })}`,
    ),
};

export const profileApi = {
  getMyProfile: () => apiRequest<FeromeetUser>('/api/user/get-my-user'),
  saveHeight: (height: number) =>
    post<void>('/api/user/save/height', { height }),
  saveAbout: (textAbout: string) =>
    post<void>('/api/user/save/text-about', { textAbout }),
  saveLocation: (latitude: number, longitude: number, city: string) =>
    post<void>('/api/user/save/geo', { latitude, longitude, city }),
  saveFerotags: (ferotags: string[]) =>
    post<void>('/api/user/save/ferotags', { ferotags }),
  saveInfotags: (infotags: unknown[]) =>
    post<void>('/api/user/save/infotags', { infotags }),
  savePhotos: (form: FormData) =>
    apiRequest<void>('/api/user/save/photos', {
      method: 'POST',
      body: form,
    }),
  deleteAccount: () =>
    apiRequest<void>('/api/user/delete', { method: 'DELETE' }),
};

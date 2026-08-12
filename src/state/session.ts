import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { configureTokenStorage } from '../api/client';
import type { AuthTokens } from '../domain/models';

const STORAGE_KEY = 'feromeet.session';

interface SessionState {
  accessToken?: string;
  refreshToken?: string;
  registrationStatus?: string;
  phoneNumber?: string;
  hydrated: boolean;
  isAuthenticated: boolean;
  demoMode: boolean;
  setPhoneNumber: (phoneNumber?: string) => void;
  setTokens: (tokens?: AuthTokens) => Promise<void>;
  enterDemo: () => void;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function readStorage(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(STORAGE_KEY);
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeStorage(value?: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, value);
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  hydrated: false,
  isAuthenticated: false,
  demoMode: false,

  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  enterDemo: () => set({ demoMode: true, isAuthenticated: true }),

  setTokens: async (tokens) => {
    if (tokens) {
      await writeStorage(JSON.stringify(tokens));
      set({
        ...tokens,
        demoMode: false,
        isAuthenticated: true,
      });
    } else {
      await writeStorage();
      set({
        accessToken: undefined,
        refreshToken: undefined,
        registrationStatus: undefined,
        demoMode: false,
        isAuthenticated: false,
      });
    }
  },

  hydrate: async () => {
    try {
      const raw = await readStorage();
      if (!raw) return;
      const tokens = JSON.parse(raw) as AuthTokens;
      if (tokens.accessToken && tokens.refreshToken) {
        set({ ...tokens, isAuthenticated: true });
      }
    } catch {
      await writeStorage();
    } finally {
      set({ hydrated: true });
    }
  },

  signOut: async () => {
    await get().setTokens(undefined);
    set({ phoneNumber: undefined, demoMode: false });
  },
}));

configureTokenStorage(
  () => {
    const { accessToken, refreshToken } = useSessionStore.getState();
    return { accessToken, refreshToken };
  },
  (tokens) => useSessionStore.getState().setTokens(tokens),
);

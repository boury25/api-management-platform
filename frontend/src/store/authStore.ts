'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setCookie, getCookie, removeCookie } from '@/lib/cookies';
import type { User, TokenPair } from '@/types';

const ACCESS_TOKEN_COOKIE = 'amp_access_token';
const ACCESS_TOKEN_EXPIRY_HOURS = 1;

interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (user: User, tokens: TokenPair) => void;
  setTokens: (tokens: TokenPair) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setAuth: (user, tokens) => {
        // Persist access token in a 1-hour cookie
        setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, ACCESS_TOKEN_EXPIRY_HOURS);
        set({ user, tokens, isAuthenticated: true });
      },

      setTokens: (tokens) => {
        // Refresh the cookie whenever tokens rotate
        setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, ACCESS_TOKEN_EXPIRY_HOURS);
        set({ tokens });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        removeCookie(ACCESS_TOKEN_COOKIE);
        set({ user: null, tokens: null, isAuthenticated: false });
      },
    }),
    {
      name: 'amp-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If localStorage says authenticated but the cookie is gone (expired),
          // treat the session as invalid and force a clean logout.
          if (state.isAuthenticated && !getCookie(ACCESS_TOKEN_COOKIE)) {
            state.user = null;
            state.tokens = null;
            state.isAuthenticated = false;
          }
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

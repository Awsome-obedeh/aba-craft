// src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    accessToken: null, // Stored safely in-memory
    user: null,

    setAuthData: (token, userData) => set({ accessToken: token, user: userData }),
    clearAuth: () => set({ accessToken: null, user: null }),
}));

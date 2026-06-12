// src/lib/api.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';


export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true, // Crucial: sends httpOnly cookies to the backend
});

// 1. REQUEST INTERCEPTOR: Injects the in-memory token
api.interceptors.request.use(
    (config) => {
        // Grab the token synchronously straight from memory
        const token = useAuthStore.getState().accessToken;
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. RESPONSE INTERCEPTOR: Handles Silent Refresh on 401 errors
api.interceptors.response.use(
    (response) => response, 
    async (error) => {
        const originalRequest = error.config;

        // If backend returns 401 and we haven't tried retrying yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Hit your backend refresh endpoint. 
                // The browser automatically attaches the httpOnly refresh cookie.
                const res = await api.post(
                    '/auth/refresh',
                    {},
                    { withCredentials: true }
                );

                const { accessToken } = res.data;

                // Save the brand new token back into app memory
                useAuthStore.getState().setAuthData(accessToken, useAuthStore.getState().user);

                // Update the failed request's header and replay it
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                // Refresh token is expired or invalid -> Log user out completely
                useAuthStore.getState().clearAuth();
                window.location.href = '/auth/sign-in';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
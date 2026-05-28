// src/components/AuthProvider.js (or inside your root App/Layout)
'use client';
import { useEffect, useState } from 'react';


import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import LoadingScreen from './LoadingScreen';

export default function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const setAuthData = useAuthStore((state) => state.setAuthData);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Fire an empty request to refresh. If the cookie is valid, 
                // it returns a fresh access token seamlessly.
                const res = await api.post('/auth/refresh');
                setAuthData(res.data.accessToken, res.data.user);
            } catch (err) {
                console.log("No active session found.");
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, [setAuthData]);

    if (loading) return <LoadingScreen />;

    return children;
}
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/axios';
import { useAuthStore } from '@/app/store/authStore';
import LoadingScreen from './LoadingScreen';

export default function AuthProvider({ children }) {
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const setAuthData = useAuthStore(value => value.setAuthData);
  useEffect(() => {
    let cancelled = false;
    api.post('/auth/refresh').then(res => {
      if (!cancelled) { setAuthData(res.data.accessToken, res.data.user); setState('ready'); }
    }).catch(error => {
      if (!cancelled) setState(error.response?.status === 401 ? 'ready' : 'error');
    });
    return () => { cancelled = true; };
  }, [attempt, setAuthData]);
  if (state === 'loading') return <LoadingScreen />;
  if (state === 'error') return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-xl font-semibold">Account service unavailable</h1><p role="alert">We could not restore your session. Please try again.</p><button className="rounded-lg bg-forest px-5 py-3 text-white" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Try again</button></main>;
  return children;
}

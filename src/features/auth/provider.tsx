import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { verifySession } from './session-validation';

const AuthContext = createContext<{session: Session | null; loading: boolean; error: string | null; retry: () => void}>({session:null, loading:true, error:null, retry: () => {}});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [candidate, setCandidate] = useState<{ value: Session | null } | null>(null);
  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    let active = true;
    let authEventReceived = false;
    const {data: {subscription}} = client.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (active) { setLoading(true); setCandidate({ value: next }); }
    });
    client.auth.getSession().then(({data, error}) => {
      if (active && !authEventReceived) {
        if (error) { setSession(null); setError('Não foi possível recuperar sua sessão.'); setLoading(false); }
        else setCandidate({ value: data.session });
      }
    }).catch(() => { if (active) {setError('Não foi possível recuperar sua sessão.'); setLoading(false);} });
    const refresh = (state: string | null | undefined) => state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh();
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { active = false; subscription.unsubscribe(); listener.remove(); client.auth.stopAutoRefresh(); };
  }, [attempt]);
  useEffect(() => {
    if (!candidate || !supabase) return;
    let active = true;
    setError(null);
    const next = candidate.value;
    if (!next) { setSession(null); setLoading(false); return; }
    // Outside onAuthStateChange: Auth callbacks must never wait on the Auth lock.
    void verifySession(supabase, next).then(verified => {
      if (active) { setSession(verified); setLoading(false); }
    }).catch(() => {
      if (active) { setSession(null); setError('Não foi possível validar seu acesso. Confira a conexão e a confirmação do e-mail ou entre novamente.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [candidate]);
  return <AuthContext.Provider value={{session,loading,error,retry: () => setAttempt(value => value + 1)}}>{children}</AuthContext.Provider>;
}

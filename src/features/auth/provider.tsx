import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext<{session: Session | null; loading: boolean; error: string | null}>({session:null, loading:true, error:null});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    let active = true;
    let authEventReceived = false;
    const {data: {subscription}} = client.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (active) { setSession(next); setLoading(false); }
    });
    client.auth.getSession().then(({data, error}) => {
      if (active && !authEventReceived) { setSession(data.session); setError(error ? 'Não foi possível recuperar sua sessão.' : null); setLoading(false); }
    }).catch(() => { if (active) {setError('Não foi possível recuperar sua sessão.'); setLoading(false);} });
    const refresh = (state: string | null | undefined) => state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh();
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { active = false; subscription.unsubscribe(); listener.remove(); client.auth.stopAutoRefresh(); };
  }, []);
  return <AuthContext.Provider value={{session,loading,error}}>{children}</AuthContext.Provider>;
}

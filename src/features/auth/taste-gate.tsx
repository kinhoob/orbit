import React, { useEffect, useRef, useState } from 'react';
import { Redirect, usePathname } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from './provider';
import { needsTasteOnboarding } from './onboarding';

const EXEMPT = new Set(['/auth', '/auth/callback', '/onboarding']);

// A escolha de gostos é obrigatória (pedido do Marco em 21/11/2026): qualquer
// rota fora do fluxo de acesso leva a conta incompleta para /onboarding, não
// só o login ou o link do e-mail. Erro transitório na verificação NÃO conta
// como setup completo: manda para /onboarding, que oferece tentar de novo.
export function TasteGate({ children }: React.PropsWithChildren) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<'checking' | 'allow' | 'onboard'>('checking');
  const lastPath = useRef(pathname);
  useEffect(() => {
    const returnedFromOnboarding = lastPath.current === '/onboarding' && pathname !== '/onboarding';
    lastPath.current = pathname;
    if (loading) return;
    if (!session || !supabase) { setState('allow'); return; }
    if (state === 'allow' && !returnedFromOnboarding) return;
    let active = true;
    needsTasteOnboarding(session.user.id)
      .then(needed => { if (active) setState(needed ? 'onboard' : 'allow'); })
      .catch(() => { if (active) setState('onboard'); });
    return () => { active = false; };
  }, [loading, session?.user.id, pathname]);
  if (state === 'onboard' && !EXEMPT.has(pathname)) return <Redirect href="/onboarding" />;
  return <>{children}</>;
}

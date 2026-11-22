import React, { useEffect, useRef, useState } from 'react';
import { Link, Redirect, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';
import { font, tokens as t } from '../../design/tokens';
import { useAuth } from './provider';
import { needsTasteOnboarding } from './onboarding';
import { tasteGateDecision } from './gate-state.mjs';

const EXEMPT = new Set(['/auth', '/auth/callback', '/onboarding']);

// A escolha de gostos é obrigatória (pedido do Marco em 21/11/2026): qualquer
// rota fora do fluxo de acesso leva a conta incompleta para /onboarding.
// A consulta precisa terminar antes de liberar a tela. Um erro não confirma
// nem desmente o cadastro: permite tentar de novo, sem confiar no cache local.
export function TasteGate({ children }: React.PropsWithChildren) {
  const { session, loading, error: authError, retry: retryAuth } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<'checking' | 'allow' | 'onboard' | 'retry'>('checking');
  const [attempt, setAttempt] = useState(0);
  const [checkedSession, setCheckedSession] = useState<typeof session>(null);
  const lastPath = useRef(pathname);
  useEffect(() => {
    const returnedFromOnboarding = lastPath.current === '/onboarding' && pathname !== '/onboarding';
    lastPath.current = pathname;
    if (loading) return;
    if (!session || !supabase) { setState('allow'); setCheckedSession(null); return; }
    if (state === 'allow' && checkedSession === session && !returnedFromOnboarding) return;
    setState('checking');
    let active = true;
    void (async () => {
      let check: 'complete' | 'incomplete' | 'error' = 'error';
      try { check = (await needsTasteOnboarding(session.user.id)) ? 'incomplete' : 'complete'; }
      catch { /* Keep the retry state until the server can answer. */ }
      if (active) { setCheckedSession(session); setState(tasteGateDecision(true, check, false)); }
    })();
    return () => { active = false; };
  }, [loading, session, pathname, attempt]);
  let gate: React.ReactNode = null;
  if (!EXEMPT.has(pathname)) {
    if (loading || (session && (state === 'checking' || checkedSession !== session))) {
      gate = <View style={styles.retryRoot}><Text accessibilityRole="progressbar" style={{color:t.colors.onDark}}>Validando sua conta…</Text></View>;
    }
    else if (authError || state === 'retry') {
      gate = (
        <View style={styles.retryRoot}>
          <View style={styles.retryCard}>
            <Text style={styles.retryTitle}>Sem verificação agora.</Text>
            <Text style={styles.retryBody}>{authError || 'Não foi possível confirmar o estado da sua conta. Nada foi perdido. Tente de novo em instantes.'}</Text>
            <Button label="Tentar de novo" onPress={() => { if (authError) retryAuth(); else { setState('checking'); setAttempt(a => a + 1); } }} />
            <Link href="/auth" style={{color:t.colors.text}}>Entrar novamente</Link>
          </View>
        </View>
      );
    }
    else if (session && state === 'onboard') gate = <Redirect href="/onboarding" />;
  }
  // Expo Router must mount the root navigator even while access is being
  // checked. Keep it hidden and inert under the gate instead of unmounting it.
  return <View style={{flex:1}}>
    <View style={{flex:1,opacity:gate ? 0 : 1}} pointerEvents={gate ? 'none' : 'auto'} accessibilityElementsHidden={!!gate} importantForAccessibility={gate ? 'no-hide-descendants' : 'auto'}>{children}</View>
    {gate && <View style={StyleSheet.absoluteFill}>{gate}</View>}
  </View>;
}

const styles = StyleSheet.create({
  retryRoot: { flex: 1, backgroundColor: t.colors.dark, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryCard: { width: '100%', maxWidth: 440, padding: 20, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 18 },
  retryTitle: { fontSize: 22, fontFamily: font.extrabold, letterSpacing: -0.3, color: t.colors.text },
  retryBody: { fontSize: 15, lineHeight: 23, fontFamily: font.regular, color: t.colors.muted },
});

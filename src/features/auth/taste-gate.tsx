import React, { useEffect, useRef, useState } from 'react';
import { Redirect, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';
import { font, tokens as t } from '../../design/tokens';
import { useAuth } from './provider';
import { isTasteCompleteKnown, needsTasteOnboarding } from './onboarding';
import { tasteGateDecision } from './gate-state.mjs';

const EXEMPT = new Set(['/auth', '/auth/callback', '/onboarding']);

// A escolha de gostos é obrigatória (pedido do Marco em 21/11/2026): qualquer
// rota fora do fluxo de acesso leva a conta incompleta para /onboarding, não
// só o login ou o link do e-mail. Erro transitório NÃO conta como setup
// completo nem como setup pendente: conta com registro local confirmado usa o
// fallback de queda; conta desconhecida vê um estado neutro de tentar de novo.
export function TasteGate({ children }: React.PropsWithChildren) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<'checking' | 'allow' | 'onboard' | 'retry'>('checking');
  const [attempt, setAttempt] = useState(0);
  const lastPath = useRef(pathname);
  useEffect(() => {
    const returnedFromOnboarding = lastPath.current === '/onboarding' && pathname !== '/onboarding';
    lastPath.current = pathname;
    if (loading) return;
    if (!session || !supabase) { setState('allow'); return; }
    if (state === 'allow' && !returnedFromOnboarding) return;
    let active = true;
    void (async () => {
      let check: 'complete' | 'incomplete' | 'error' = 'error';
      let knownComplete = false;
      try { check = (await needsTasteOnboarding(session.user.id)) ? 'incomplete' : 'complete'; }
      catch { knownComplete = await isTasteCompleteKnown(session.user.id).catch(() => false); }
      if (active) setState(tasteGateDecision(true, check, knownComplete));
    })();
    return () => { active = false; };
  }, [loading, session?.user.id, pathname, attempt]);
  if (!EXEMPT.has(pathname)) {
    if (state === 'onboard') return <Redirect href="/onboarding" />;
    if (state === 'retry') {
      return (
        <View style={styles.retryRoot}>
          <View style={styles.retryCard}>
            <Text style={styles.retryTitle}>Sem verificação agora.</Text>
            <Text style={styles.retryBody}>Não foi possível confirmar o estado da sua conta. Nada foi perdido. Tente de novo em instantes.</Text>
            <Button label="Tentar de novo" onPress={() => { setState('checking'); setAttempt(a => a + 1); }} />
          </View>
        </View>
      );
    }
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  retryRoot: { flex: 1, backgroundColor: t.colors.dark, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryCard: { width: '100%', maxWidth: 440, padding: 20, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 18 },
  retryTitle: { fontSize: 22, fontFamily: font.extrabold, letterSpacing: -0.3, color: t.colors.text },
  retryBody: { fontSize: 15, lineHeight: 23, fontFamily: font.regular, color: t.colors.muted },
});

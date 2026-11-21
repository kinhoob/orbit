import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { MotionPressable, ScreenMotion } from '../../src/components/motion';
import { Icon, OrbitMark } from '../../src/components/icons';
import { font, tokens as t } from '../../src/design/tokens';
import { requireSupabase } from '../../src/lib/supabase';
import { validateCredentials } from '../../src/features/auth/validation.mjs';

type Mode = 'login' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'Bom ter você por aqui.',
  signup: 'Crie seu universo.',
  reset: 'Recupere seu acesso.',
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  function select(next: Mode) {
    setMode(next); setMessage(''); setPassword(''); setFailed(false); setShowPassword(false);
  }

  async function submit() {
    setMessage(''); setFailed(false);
    const invalid = validateCredentials(email, mode === 'reset' ? 'password' : password);
    if (invalid) { setMessage(invalid); setFailed(true); return; }
    setBusy(true);
    try {
      const client = requireSupabase();
      const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'orbit://auth/callback';
      const result = mode === 'login' ? await client.auth.signInWithPassword({ email: email.trim(), password }) : mode === 'signup' ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } }) : await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
      if (result.error) throw result.error;
      if (mode === 'login') { router.replace('/(tabs)/profile'); return; }
      setMessage(mode === 'signup' ? 'Cadastro enviado. Confira seu e-mail para confirmar a conta.' : 'Se houver uma conta com esse e-mail, você receberá o link de recuperação.');
    } catch { setFailed(true); setMessage('Não foi possível concluir. Confira os dados, a conexão e a configuração do Supabase.'); }
    finally { setBusy(false); }
  }

  // Pedido do Marco em 21/11/2026: o login fica central, no meio da tela.
  // A coluna rola quando a tela é baixa ou o teclado abre, sem esconder campos.
  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ScreenMotion testID="screen-motion" style={styles.center}>
          <View style={styles.brand}>
            <OrbitMark size={56} />
            <Text style={styles.wordmark}>ORBIT</Text>
            <Text style={styles.tagline}>Seu universo de filmes, séries, livros e músicas.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>{TITLES[mode]}</Text>
            {mode !== 'reset' && (
              <View style={styles.switch}>
                {(['login', 'signup'] as Mode[]).map(item => {
                  const active = mode === item;
                  return (
                    <MotionPressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} disabled={busy} onPress={() => select(item)} style={[styles.switchItem, active && styles.switchItemActive]}>
                      <Text style={[styles.switchLabel, active && styles.switchLabelActive]}>{item === 'login' ? 'Entrar' : 'Criar conta'}</Text>
                    </MotionPressable>
                  );
                })}
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput accessibilityLabel="E-mail" style={styles.input} value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" placeholderTextColor={t.colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType={mode === 'reset' ? 'send' : 'next'} onSubmitEditing={() => { if (mode === 'reset') void submit(); }} editable={!busy} />
            </View>
            {mode !== 'reset' && (
              <View style={styles.field}>
                <Text style={styles.label}>Senha · mínimo de 8 caracteres</Text>
                <View style={styles.passwordWrap}>
                  <TextInput accessibilityLabel="Senha" style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} returnKeyType="go" onSubmitEditing={() => { void submit(); }} editable={!busy} />
                  <MotionPressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} hitSlop={8} disabled={busy} onPress={() => setShowPassword(value => !value)} style={styles.eye}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={t.colors.muted} />
                  </MotionPressable>
                </View>
                {mode === 'login' && (
                  <MotionPressable accessibilityRole="button" disabled={busy} onPress={() => select('reset')} style={styles.forgot}>
                    <Text style={styles.forgotText}>Esqueci a senha</Text>
                  </MotionPressable>
                )}
              </View>
            )}
            <Button label={busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'} onPress={() => { void submit(); }} disabled={busy} />
            {!!message && (
              <View style={[styles.feedback, failed ? styles.feedbackError : styles.feedbackOk]}>
                <Text accessibilityRole="alert" style={[styles.feedbackText, { color: failed ? t.colors.error : t.colors.success }]}>{message}</Text>
              </View>
            )}
            {mode === 'reset' && (
              <MotionPressable accessibilityRole="button" disabled={busy} onPress={() => select('login')} style={styles.backToLogin}>
                <Text style={styles.forgotText}>Voltar para entrar</Text>
              </MotionPressable>
            )}
          </View>
          <Link href="/" style={styles.home}>Voltar ao início</Link>
        </ScreenMotion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.dark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  center: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22 },
  brand: { alignItems: 'center', gap: 8 },
  wordmark: { fontFamily: font.extrabold, fontSize: 20, letterSpacing: 6, color: t.colors.onDark, marginLeft: 6 },
  tagline: { fontFamily: font.regular, fontSize: 13, color: t.colors.onDarkMuted, textAlign: 'center' },
  card: { padding: 20, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 18, boxShadow: '0 12px 32px rgba(0,0,0,0.28)', elevation: 4 },
  title: { fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.5, lineHeight: 32, color: t.colors.text },
  switch: { flexDirection: 'row', backgroundColor: t.colors.secondary, borderRadius: 999, padding: 4, gap: 4 },
  switchItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  switchItemActive: { backgroundColor: t.colors.surface, boxShadow: '0 2px 8px rgba(23,20,15,0.10)', elevation: 1 },
  switchLabel: { fontSize: 14, fontFamily: font.semibold, color: t.colors.muted },
  switchLabelActive: { color: t.colors.text },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: font.medium, color: t.colors.muted },
  input: { borderWidth: 1, borderColor: t.colors.border, borderRadius: 16, padding: 16, fontSize: 16, fontFamily: font.regular, color: t.colors.text, backgroundColor: t.colors.surface },
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: 8, padding: 8 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 14, fontFamily: font.semibold, color: t.colors.text },
  feedback: { borderRadius: 16, padding: 14 },
  feedbackError: { backgroundColor: 'rgba(163,50,50,0.08)' },
  feedbackOk: { backgroundColor: 'rgba(34,99,68,0.10)' },
  feedbackText: { fontSize: 14, lineHeight: 21, fontFamily: font.regular },
  backToLogin: { alignSelf: 'center', paddingVertical: 4 },
  home: { alignSelf: 'center', color: t.colors.onDarkMuted, fontSize: 14, fontFamily: font.semibold, paddingVertical: 10 },
});

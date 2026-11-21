import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { MotionPressable, ScreenMotion } from '../../src/components/motion';
import { Icon, OrbitMark } from '../../src/components/icons';
import { font, tokens as t } from '../../src/design/tokens';
import { requireSupabase } from '../../src/lib/supabase';
import { emailError, validateCredentials } from '../../src/features/auth/validation.mjs';

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
  const [emailTouched, setEmailTouched] = useState(false);
  // Cadastro aprovado pelo Marco em 21/11/2026: depois do signUp, um estado
  // próprio de "Confira seu e-mail" com reenvio real via Supabase auth.resend.
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  function select(next: Mode) {
    setMode(next); setMessage(''); setPassword(''); setFailed(false); setShowPassword(false); setConfirmationEmail(null);
  }

  const invalidEmail = emailTouched ? emailError(email) : null;

  async function submit() {
    setMessage(''); setFailed(false); setEmailTouched(true);
    const invalid = validateCredentials(email, mode === 'reset' ? 'password' : password);
    if (invalid) { setMessage(invalid); setFailed(true); return; }
    setBusy(true);
    try {
      const client = requireSupabase();
      const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'orbit://auth/callback';
      const result = mode === 'login' ? await client.auth.signInWithPassword({ email: email.trim(), password }) : mode === 'signup' ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } }) : await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
      if (result.error) throw result.error;
      if (mode === 'login') { router.replace('/(tabs)/profile'); return; }
      if (mode === 'signup') { setConfirmationEmail(email.trim()); return; }
      setMessage('Se houver uma conta com esse e-mail, você receberá o link de recuperação.');
    } catch { setFailed(true); setMessage('Não foi possível concluir. Confira os dados, a conexão e a configuração do Supabase.'); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!confirmationEmail) return;
    setMessage(''); setFailed(false); setResendBusy(true);
    try {
      const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'orbit://auth/callback';
      const { error } = await requireSupabase().auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: redirect } });
      if (error) throw error;
      setMessage('Link reenviado. Confira sua caixa de entrada e o spam.');
    } catch { setFailed(true); setMessage('Não foi possível reenviar agora. Confira a conexão e a configuração do Supabase.'); }
    finally { setResendBusy(false); }
  }

  const passwordReady = password.length >= 8;

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
          {confirmationEmail ? (
            <View style={styles.card}>
              <View style={styles.confirmIcon}><Icon name="mail" size={26} color={t.colors.accentStrong} /></View>
              <Text style={styles.title}>Confira seu e-mail.</Text>
              <Text style={styles.body}>Enviamos um link de confirmação para {confirmationEmail}. Toque no link para ativar sua conta.</Text>
              <Button label={resendBusy ? 'Reenviando…' : 'Reenviar link de confirmação'} onPress={() => { void resend(); }} disabled={resendBusy} />
              {!!message && (
                <View style={[styles.feedback, failed ? styles.feedbackError : styles.feedbackOk]}>
                  <Text accessibilityRole="alert" style={[styles.feedbackText, { color: failed ? t.colors.error : t.colors.success }]}>{message}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>{TITLES[mode]}</Text>
              {mode === 'signup' && <Text style={styles.body}>Salve suas obras e descubra o que seus amigos estão curtindo.</Text>}
              <View style={styles.field}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput accessibilityLabel="E-mail" style={[styles.input, !!invalidEmail && styles.inputError]} value={email} onChangeText={setEmail} onBlur={() => setEmailTouched(true)} placeholder="voce@exemplo.com" placeholderTextColor={t.colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType={mode === 'reset' ? 'send' : 'next'} onSubmitEditing={() => { if (mode === 'reset') void submit(); }} editable={!busy} />
                {!!invalidEmail && <Text accessibilityRole="alert" style={styles.fieldError}>{invalidEmail}</Text>}
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
                  {mode === 'signup' && password.length > 0 && (
                    <View style={styles.hintRow}>
                      {passwordReady && <Icon name="check" size={14} color={t.colors.success} strokeWidth={3} />}
                      <Text style={[styles.hint, { color: passwordReady ? t.colors.success : t.colors.muted }]}>{passwordReady ? 'Senha dentro do mínimo de 8 caracteres.' : `Faltam ${8 - password.length} para o mínimo de 8 caracteres.`}</Text>
                    </View>
                  )}
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
            </View>
          )}
          {/* Pedido do Marco em 21/11/2026: Criar conta fica no lugar do antigo
              "Voltar ao início" e abre o formulário de cadastro com e-mail e senha. */}
          <MotionPressable accessibilityRole="button" disabled={busy || resendBusy} onPress={() => { if (confirmationEmail) { setConfirmationEmail(null); setMessage(''); setFailed(false); } else { select(mode === 'login' ? 'signup' : 'login'); } }} style={styles.secondary}>
            <Text style={styles.secondaryText}>{confirmationEmail ? 'Voltar para entrar' : mode === 'login' ? 'Criar conta' : mode === 'signup' ? 'Já tenho conta' : 'Voltar para entrar'}</Text>
          </MotionPressable>
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
  body: { fontSize: 15, lineHeight: 23, fontFamily: font.regular, color: t.colors.muted },
  confirmIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  secondary: { borderWidth: 1.5, borderColor: t.colors.onDarkMuted, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  secondaryText: { color: t.colors.onDark, fontSize: 15, fontFamily: font.semibold },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: font.medium, color: t.colors.muted },
  input: { borderWidth: 1, borderColor: t.colors.border, borderRadius: 16, padding: 16, fontSize: 16, fontFamily: font.regular, color: t.colors.text, backgroundColor: t.colors.surface },
  inputError: { borderColor: t.colors.error },
  fieldError: { fontSize: 13, fontFamily: font.medium, color: t.colors.error },
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: 8, padding: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { fontSize: 13, fontFamily: font.medium },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 14, fontFamily: font.semibold, color: t.colors.text },
  feedback: { borderRadius: 16, padding: 14 },
  feedbackError: { backgroundColor: 'rgba(163,50,50,0.08)' },
  feedbackOk: { backgroundColor: 'rgba(34,99,68,0.10)' },
  feedbackText: { fontSize: 14, lineHeight: 21, fontFamily: font.regular },
});

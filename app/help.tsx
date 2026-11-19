import React, { useState } from 'react';
import { Linking, Text, TextInput } from 'react-native';
import { Screen, styles, Button } from '../src/components/ui';
import { Link } from 'expo-router';
export default function Help() {
  const [text, setText] = useState(''); const [error, setError] = useState('');
  async function feedback() { try { await Linking.openURL(`https://github.com/kinhoob/orbit/issues/new?title=${encodeURIComponent('Feedback ORBIT')}&body=${encodeURIComponent(text)}`); } catch { setError('Não foi possível abrir o GitHub. Tente pelo navegador.'); } }
  return <Screen><Link href="/(tabs)/profile" style={styles.link}>← Perfil</Link><Text style={styles.title}>Ajuda e feedback</Text>
    <Text style={styles.eyebrow}>COMO AVALIAR?</Text><Text style={styles.body}>Abra Criar, escolha uma obra e dê uma nota de 0 a 10. Você escolhe quem pode ver sua opinião.</Text>
    <Text style={styles.eyebrow}>ONDE FICAM MEUS SALVOS?</Text><Text style={styles.body}>Na Minha biblioteca, no menu lateral. Os salvos são privados; coleções podem ser públicas se você escolher.</Text>
    <Text style={styles.eyebrow}>COMO FUNCIONAM AS AMIZADES?</Text><Text style={styles.body}>Envie uma solicitação e espere a outra pessoa aceitar. O ORBIT não tem seguidores.</Text>
    <TextInput accessibilityLabel="Seu feedback" placeholder="Conte o que aconteceu ou o que podemos melhorar…" value={text} onChangeText={setText} multiline maxLength={3000} style={[styles.input, { minHeight: 130 }]} />
    <Text style={styles.body}>O botão abre um rascunho público no GitHub para você revisar. Não inclua senhas, chaves ou dados pessoais. Nada é enviado automaticamente.</Text><Button label="Abrir rascunho de feedback" disabled={!text.trim()} onPress={() => { void feedback(); }} />{!!error && <Text style={styles.error}>{error}</Text>}
  </Screen>;
}

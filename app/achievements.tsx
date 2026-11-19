import React from 'react';
import { Text, View } from 'react-native';
import { AccountScreen } from '../src/components/account-screen';
import { Button, styles } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { ProgressSummary } from '../src/components/progress';
import { useAccountProgress } from '../src/features/account/settings';
export default function Achievements() {
  const query = useAccountProgress();
  return <AccountScreen title="Conquistas e nível"><ProgressSummary />
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Seu progresso ainda não está disponível. Verifique a conexão e a atualização do serviço.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : <>
      <Text style={styles.body}>Você ganha XP uma vez por obra avaliada e pela primeira coleção. Editar ou recriar a mesma avaliação não multiplica a recompensa.</Text>
      {[{ title: 'Primeira avaliação', done: query.data.rated_works >= 1, progress: `${Math.min(query.data.rated_works, 1)}/1` }, { title: 'Cinco descobertas avaliadas', done: query.data.rated_works >= 5, progress: `${Math.min(query.data.rated_works, 5)}/5` }, { title: 'Primeira coleção', done: query.data.first_collection, progress: query.data.first_collection ? '1/1' : '0/1' }].map(item => <View key={item.title} style={styles.card}><Text style={[styles.body, { fontWeight: '700' }]}>{item.done ? '✓ ' : ''}{item.title}</Text><Text style={styles.body}>{item.done ? 'Conquista desbloqueada' : `Em progresso · ${item.progress}`}</Text></View>)}
    </>}
  </AccountScreen>;
}

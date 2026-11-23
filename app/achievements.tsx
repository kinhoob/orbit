import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { Button, styles } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { ProgressSummary } from '../src/components/progress';
import { BadgeChip } from '../src/components/profile-badges';
import { AchievementCard } from '../src/components/achievement-card';
import { useAuth } from '../src/features/auth/provider';
import { achievementsUnavailable, saveEquippedBadges, useMyAchievements, type AchievementState } from '../src/features/account/achievements';
import { MAX_EQUIPPED_BADGES, toggleEquippedBadge } from '../src/domain/achievements.mjs';


export default function Achievements() {
  const { session } = useAuth();
  const cache = useQueryClient();
  const query = useMyAchievements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function toggle(item: AchievementState) {
    if (!session || !query.data || busy) return;
    const next = toggleEquippedBadge(query.data.equipped, item.id, query.data.achievements.filter((a) => a.unlocked).map((a) => a.id));
    if (next === null) { setMessage(`Escolha até ${MAX_EQUIPPED_BADGES} insígnias desbloqueadas para o perfil.`); return; }
    setBusy(true); setMessage('');
    try {
      await saveEquippedBadges(session.user.id, next);
      await cache.invalidateQueries({ queryKey: ['my-achievements', session.user.id] });
      await cache.invalidateQueries({ queryKey: ['profile', session.user.id] });
      await cache.invalidateQueries({ queryKey: ['public-profile'] });
    } catch {
      setMessage('Não foi possível salvar. A insígnia precisa estar desbloqueada; tente novamente.');
      await cache.invalidateQueries({ queryKey: ['my-achievements', session.user.id] });
    } finally { setBusy(false); }
  }

  return <AccountScreen title="Conquistas e insígnias">
    <ProgressSummary />
    <Text style={styles.body}>Você ganha XP uma vez por obra avaliada, pela primeira coleção e por cada conquista alcançada. Editar ou reavaliar a mesma obra não multiplica a recompensa. Escolha até {MAX_EQUIPPED_BADGES} insígnias desbloqueadas para enfeitar seu perfil — elas aparecem para quem visitar você.</Text>
    {query.isPending ? <LoadingState kind="feed" />
      : query.isError ? (
        achievementsUnavailable()
          ? <Text style={styles.body}>As conquistas chegam com a próxima atualização do banco, que já está em revisão. Seu XP e suas avaliações continuam guardados.</Text>
          : <><Text style={styles.error}>Suas conquistas ainda não estão disponíveis. Verifique a conexão.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></>
      ) : !query.data ? null : <>
        {query.data.equipped.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={styles.eyebrow}>NO SEU PERFIL</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {query.data.equipped.map((id) => {
                const found = query.data!.achievements.find((a) => a.id === id);
                return found ? <BadgeChip key={id} icon={found.icon} title={found.title} /> : null;
              })}
            </View>
          </View>
        )}
        {query.data.achievements.map((item) => (
          <AchievementCard key={item.id} item={item} equipped={query.data!.equipped.includes(item.id)} busy={busy} onToggle={() => { void toggle(item); }} />
        ))}
        {!!message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
      </>}
  </AccountScreen>;
}

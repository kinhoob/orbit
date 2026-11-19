import React, { useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, styles } from '../../src/components/ui';
import { Categories } from '../../src/components/catalog';
import { CuratedBadge, IllustratedCover, MuralWall } from '../../src/components/mural';
import { WeekCalendar } from '../../src/components/week';
import { MotionPressable, CardEntrance } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { curatedMuralItems, type CuratedItem } from '../../src/features/home/curated-data.mjs';
import { categories } from '../../src/features/catalog/data';
import { weekDays, picksForDay } from '../../src/domain/week.mjs';
import { Interests } from '../../src/components/interests';
import { useAuth } from '../../src/features/auth/provider';
import { supabase } from '../../src/lib/supabase';
import { font, headerTint, tokens as t } from '../../src/design/tokens';

export default function Home() {
  const { session } = useAuth();
  return <HomeSession key={session?.user.id || 'guest'} account={session?.user.id || 'guest'} />;
}

/** Data por extenso na zona escura ("Quinta, 19 de novembro"). */
function todayLine(): string {
  const line = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Cartão protagonista da Início (referência aprovada pelo Marco em 19/11/2026):
 * capa grande central com sombra suave e card de metadados em creme claro. */
function DailyHero({ item }: { item: CuratedItem }) {
  const categoryLabel = categories.find((c) => c.id === item.category)?.label ?? 'Outros';
  const [coverFailed, setCoverFailed] = useState(false);
  return (
    <View style={{ gap: 18 }}>
      <CardEntrance index={0}>
        <Link href={{ pathname: '/curated/[id]', params: { id: item.id } }} asChild>
          <MotionPressable accessibilityRole="link" accessibilityLabel={`Obra do dia: ${item.title}, ${item.creator}`} style={{ alignSelf: 'center', width: '72%', maxWidth: 300, borderRadius: 16, overflow: 'hidden', boxShadow: '0 22px 44px rgba(23,20,15,0.30)', elevation: 8 }}>
            {item.coverUrl && !coverFailed ? (
              <Image source={{ uri: item.coverUrl }} accessibilityLabel={`Capa oficial de ${item.title}`} onError={() => setCoverFailed(true)} style={{ width: '100%', aspectRatio: item.coverAspectRatio }} />
            ) : (
              <IllustratedCover category={item.category} aspectRatio={item.coverAspectRatio} />
            )}
          </MotionPressable>
        </Link>
      </CardEntrance>
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', padding: 20 }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 20, fontFamily: font.extrabold, letterSpacing: -0.4, color: t.colors.text }}>{item.title}</Text>
          <Text style={{ fontSize: 15, fontFamily: font.medium, color: t.colors.text }}>{item.creator}</Text>
          <Text style={{ fontSize: 13, fontFamily: font.regular, color: t.colors.muted }}>{item.releaseYear} · {categoryLabel}</Text>
        </View>
        <Link href={{ pathname: '/curated/[id]', params: { id: item.id } }} asChild>
          <MotionPressable accessibilityRole="link" accessibilityLabel={`Abrir ${item.title}`} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bookmark" size={20} color={t.colors.onDark} />
          </MotionPressable>
        </Link>
      </View>
    </View>
  );
}

function HomeSession({ account }: { account: string }) {
  const { session } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  // Indicacoes da semana com calendario (pedido do Marco em 18/11/2026): as
  // datas sao calculadas do relogio do aparelho e tocar em um dia troca as
  // indicacoes exibidas. Sao sugestoes da curadoria local (obras reais) de o
  // que ver/ouvir/jogar no dia — NAO datas de lancamento nem eventos oficiais.
  const days = useMemo(() => weekDays(new Date()), []);
  const fallback = days[0]!;
  const todayIso = days.find((d) => d.isToday)?.iso ?? fallback.iso;
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const selectedDay = days.find((d) => d.iso === selectedIso) ?? fallback;
  const pool = useMemo(() => category ? curatedMuralItems.filter(item => item.category === category)
    : interests.length ? curatedMuralItems.filter(item => interests.includes(item.category)) : curatedMuralItems, [category, interests]);
  const items = useMemo(() => picksForDay(pool, selectedDay.date, 6), [pool, selectedDay]);
  const hero = items[0];
  const pickIsos = useMemo(() => new Set(days.filter((d) => picksForDay(pool, d.date, 1).length > 0).map((d) => d.iso)), [days, pool]);
  const profile = useQuery({
    queryKey: ['account-menu', session?.user.id],
    enabled: !!session && !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!.from('profiles').select('display_name,username').eq('id', session!.user.id).single();
      if (error) throw error;
      return data;
    },
  });
  const firstName = (profile.data?.display_name || profile.data?.username || session?.user.email?.split('@')[0] || '').trim().split(' ')[0];
  const header = (
    <View style={{ gap: 24 }}>
      <View style={{ paddingLeft: 46 }}>
        <Text style={{ fontSize: 21, fontFamily: font.bold, color: t.colors.onDark }}>{firstName ? `Oi, ${firstName}` : 'Oi'}</Text>
        <Text style={{ fontSize: 13.5, fontFamily: font.regular, color: t.colors.onDarkMuted, marginTop: 2 }}>{todayLine()}</Text>
      </View>
      <WeekCalendar selectedIso={selectedDay.iso} onSelect={setSelectedIso} pickIsos={pickIsos} />
    </View>
  );
  // A troca de telas por arraste lateral (pedido do Marco em 19/11/2026)
  // mora no pager de telas do layout: esta tela monta uma vez e desliza.
  return (
    <Screen maxWidth={1120} header={header} headerTint={hero ? headerTint[hero.category] : undefined}>
      <Text style={styles.eyebrow}>ORBIT / SUA SEMANA</Text>
      <Text style={styles.title}>Obra do dia.</Text>
      {hero ? <DailyHero item={hero} /> : null}
      <Text style={styles.body}>Sugestões da curadoria local para cada dia da semana — o que ver, ouvir ou jogar, não datas de lançamento. Toque em um dia do calendário para ver as indicações dele.</Text>
      <Interests account={account} onChange={setInterests} />
      <Categories value={category} onChange={setCategory} compact />
      <CuratedBadge />
      <MuralWall items={items} />
      <Link href="/(tabs)/discover" style={styles.link}>Explorar o catálogo real →</Link>
    </Screen>
  );
                                                                                                  }

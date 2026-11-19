import React, { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,ScrollView,Text,View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles } from '../../src/components/ui';
import { TimelineTabs,TimelineList,NewPostsBubble } from '../../src/components/feed';
import { Pager } from '../../src/components/pager';
import { listDiscoverTimeline, listFriendsTimeline, setRatingLike, withLike, advanceWatermark, countNewerDiscoverReviews, countNewerFriendReviews, type FeedReview } from '../../src/features/feed/timelines';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { tokens as t } from '../../src/design/tokens';

type TimelineId = 'descobrir'|'amigos';
const TIMELINE_ORDER: TimelineId[] = ['descobrir','amigos'];

// Explorar = so o feed (arquitetura aprovada pelo Marco em 18/11/2026): abas
// Descobrir/Amigos e publicacoes em sequencia. A busca mora na aba Busca.
export default function Discover() {
  const [timeline,setTimeline]=useState<TimelineId>('descobrir');
  const [likedOverride,setLikedOverride]=useState<Record<string,FeedReview>>({});
  const [refreshing,setRefreshing]=useState(false);
  const scrollRef=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const {session}=useAuth();
  const timelinesOn=!!supabase&&!!session;
  const discoverQuery=useQuery({
    queryKey:['timeline','descobrir',session?.user.id],
    queryFn:()=>listDiscoverTimeline(session!.user.id),
    enabled:timelinesOn,
  });
  const friendsQuery=useQuery({
    queryKey:['timeline','amigos',session?.user.id],
    queryFn:()=>listFriendsTimeline(session!.user.id),
    enabled:timelinesOn,
  });
  // Balao "Novas publicacoes" (pedido do Marco em 18/11/2026, estilo X): uma
  // verificacao leve a cada 60 s conta avaliacoes mais novas que a mais recente
  // exibida. A lista atual NAO muda sozinha; o balao aparece e o toque carrega
  // as novidades e volta ao topo.
  // Marca d'agua monotonica: avanca com o snapshot verificado (nao com a pagina
  // rankeada) e confirma no toque do balao — nunca regride nem prende em loop.
  const [watermarks,setWatermarks]=useState<{descobrir:string|null;amigos:string|null}>({descobrir:null,amigos:null});
  useEffect(()=>{setWatermarks((w)=>({...w,descobrir:advanceWatermark(w.descobrir,discoverQuery.data?.newest??null)}));},[discoverQuery.data?.newest]);
  useEffect(()=>{setWatermarks((w)=>({...w,amigos:advanceWatermark(w.amigos,friendsQuery.data?.newest??null)}));},[friendsQuery.data?.newest]);
  const discoverSince=watermarks.descobrir;
  const friendsSince=watermarks.amigos;
  const newerDiscover=useQuery({
    queryKey:['timeline-newer','descobrir',session?.user.id,discoverSince],
    queryFn:()=>countNewerDiscoverReviews(discoverSince as string),
    enabled:timelinesOn&&!!discoverSince,
    refetchInterval:60*1000,
  });
  const newerFriends=useQuery({
    queryKey:['timeline-newer','amigos',session?.user.id,friendsSince],
    queryFn:()=>countNewerFriendReviews(session!.user.id,friendsSince as string),
    enabled:timelinesOn&&!!friendsSince,
    refetchInterval:60*1000,
  });
  const openNewer=(q:typeof discoverQuery)=>{
    void q.refetch();
    scrollRef.current?.scrollTo({y:0,animated:true});
  };
  // Puxar para baixo atualiza as duas timelines (pedido do Marco em 18/11/2026).
  const onRefresh=useCallback(()=>{
    if(!timelinesOn)return;
    setRefreshing(true);
    Promise.all([discoverQuery.refetch(),friendsQuery.refetch()]).finally(()=>setRefreshing(false));
  },[timelinesOn,discoverQuery.refetch,friendsQuery.refetch]);
  const toggleLike=(review:FeedReview)=>{
    if(!session)return;
    const next=withLike(review,!review.liked_by_me);
    setLikedOverride((prev)=>({...prev,[review.rating_id]:next}));
    setRatingLike(review.rating_id,session.user.id,!review.liked_by_me).catch(()=>{
      setLikedOverride((prev)=>({...prev,[review.rating_id]:review}));
    });
  };
  const applyOverrides=(list?:FeedReview[])=>(list||[]).map((r)=>likedOverride[r.rating_id]||r);
  const pageReviews=(q:typeof discoverQuery)=>q.data?.reviews;
  const renderTimeline=(q:typeof discoverQuery,emptyText:string)=>{
    if(q.isPending)return <Text style={styles.body}>Carregando avaliações…</Text>;
    if(q.isError)return <Text style={styles.error}>Não foi possível carregar a timeline.</Text>;
    const reviews=applyOverrides(pageReviews(q));
    return reviews.length?<TimelineList reviews={reviews} onToggleLike={toggleLike}/>:<Text style={styles.body}>{emptyText}</Text>;
  };
  const updating=timelinesOn&&(discoverQuery.isRefetching||friendsQuery.isRefetching);
  // Sem titulo grande nem busca: o Explorar abre direto no feed (abas no topo,
  // publicacoes em sequencia), seguindo a referencia do X enviada pelo Marco.
  return <Screen scrollRef={scrollRef} onRefresh={timelinesOn?onRefresh:undefined} refreshing={refreshing}>
    {!supabase?<Text style={styles.body}>O Explorar precisa da conexão com o Supabase para mostrar as timelines.</Text>
      :!session?<Text style={styles.body}>Entre para ver as timelines Descobrir e Amigos.</Text>
      :<>
        <TimelineTabs value={timeline} onChange={setTimeline}/>
        {updating?<View style={{alignItems:'center'}}><ActivityIndicator size="small" color={t.colors.accentStrong}/></View>:null}
        <Pager index={TIMELINE_ORDER.indexOf(timeline)} onIndexChange={(i)=>setTimeline(TIMELINE_ORDER[i]||'descobrir')} accessibilityLabel="Timelines do Explorar">
          <View style={{position:'relative'}}>
            <NewPostsBubble visible={(newerDiscover.data||0)>0} onPress={()=>openNewer(discoverQuery)}/>
            {renderTimeline(discoverQuery,'Ainda não há avaliações públicas. As mais curtidas aparecem aqui.')}
          </View>
          <View style={{position:'relative'}}>
            <NewPostsBubble visible={(newerFriends.data||0)>0} onPress={()=>openNewer(friendsQuery)}/>
            {renderTimeline(friendsQuery,'Quando seus amigos avaliarem obras, as avaliações aparecem aqui, das mais recentes.')}
          </View>
        </Pager>
      </>}
  </Screen>;
}

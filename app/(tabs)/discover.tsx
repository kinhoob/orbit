import React, { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,ScrollView,Text,View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen,styles } from '../../src/components/ui';
import { TimelineTabs,TimelineList,NewPostsBubble } from '../../src/components/feed';
import { Pager } from '../../src/components/pager';
import { listDiscoverTimeline, listFriendsTimeline, advanceWatermark, countNewerDiscoverReviews, countNewerFriendReviews, type FeedReview } from '../../src/features/feed/timelines';
import { toggleTimelineLike } from '../../src/features/feed/like-mutation';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { tokens as t } from '../../src/design/tokens';
import { LoadingState } from '../../src/components/loading';
import { Feedback } from '../../src/components/feedback';
import { inReadingOrder } from '../../src/domain/feed-order.mjs';

type TimelineId = 'descobrir'|'amigos';
const TIMELINE_ORDER: TimelineId[] = ['descobrir','amigos'];

// Explorar = so o feed (arquitetura aprovada pelo Marco em 18/11/2026): abas
// Descobrir/Amigos e publicacoes em sequencia. A busca mora na aba Busca.
export default function Discover() {
  const {session}=useAuth();
  return <DiscoverSession key={session?.user.id || 'guest'} />;
}

function DiscoverSession() {
  const cache=useQueryClient();
  const [timeline,setTimeline]=useState<TimelineId>('descobrir');
  const [likeError,setLikeError]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const order=useRef<Partial<Record<TimelineId,string[]>>>({});
  const [,acceptOrder]=useState(0);
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
  useEffect(()=>{if(discoverQuery.isSuccess)setWatermarks(w=>w.descobrir?w:({...w,descobrir:discoverQuery.data.newest||new Date().toISOString()}));},[discoverQuery.isSuccess,discoverQuery.data?.newest]);
  useEffect(()=>{if(friendsQuery.isSuccess)setWatermarks(w=>w.amigos?w:({...w,amigos:friendsQuery.data.newest||new Date().toISOString()}));},[friendsQuery.isSuccess,friendsQuery.data?.newest]);
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
  const openNewer=async(q:typeof discoverQuery,kind:TimelineId)=>{
    const result=await q.refetch();
    if(result.isSuccess&&result.data){
      order.current[kind]=result.data.reviews.map(row=>row.rating_id);
      setWatermarks(current=>({...current,[kind]:advanceWatermark(current[kind],result.data.newest)}));
      acceptOrder(value=>value+1);
      scrollRef.current?.scrollTo({y:0,animated:true});
    }
  };
  // Puxar para baixo atualiza as duas timelines (pedido do Marco em 18/11/2026).
  const onRefresh=useCallback(()=>{
    if(!timelinesOn)return;
    setRefreshing(true);
    Promise.all([discoverQuery.refetch(),friendsQuery.refetch()]).then(([discover,friends])=>{
      if(discover.isSuccess)order.current.descobrir=discover.data.reviews.map(row=>row.rating_id);
      if(friends.isSuccess)order.current.amigos=friends.data.reviews.map(row=>row.rating_id);
      setWatermarks(current=>({
        descobrir:discover.isSuccess?advanceWatermark(current.descobrir,discover.data.newest):current.descobrir,
        amigos:friends.isSuccess?advanceWatermark(current.amigos,friends.data.newest):current.amigos,
      }));
      acceptOrder(value=>value+1);
    }).finally(()=>setRefreshing(false));
  },[timelinesOn,discoverQuery.refetch,friendsQuery.refetch]);
  const toggleLike=(review:FeedReview)=>{
    if(!session)return;
    if(review.author.id===session.user.id){setLikeError('Você não pode curtir a própria avaliação.');return;}
    setLikeError('');
    void toggleTimelineLike(cache,session.user.id,review).catch(()=>setLikeError('Não foi possível atualizar a curtida. Tente novamente.'));
  };
  const pageReviews=(q:typeof discoverQuery)=>q.data?.reviews;
  const renderTimeline=(q:typeof discoverQuery,kind:TimelineId,emptyText:string)=>{
    if(q.isPending)return <LoadingState kind="feed" />;
    if(q.isError)return <Text style={styles.error}>Não foi possível carregar a timeline.</Text>;
    const rows=pageReviews(q)||[];
    if(!order.current[kind])order.current[kind]=rows.map(row=>row.rating_id);
    const reviews=inReadingOrder(order.current[kind]!,rows) as FeedReview[];
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
        <Feedback message={likeError} error />
        {updating?<View style={{alignItems:'center'}}><ActivityIndicator size="small" color={t.colors.accentStrong}/></View>:null}
        <Pager index={TIMELINE_ORDER.indexOf(timeline)} onIndexChange={(i)=>setTimeline(TIMELINE_ORDER[i]||'descobrir')} accessibilityLabel="Timelines do Explorar">
          <View style={{position:'relative'}}>
            <NewPostsBubble visible={(newerDiscover.data||0)>0} onPress={()=>{void openNewer(discoverQuery,'descobrir');}}/>
            {renderTimeline(discoverQuery,'descobrir','Ainda não há avaliações públicas. As mais curtidas aparecem aqui.')}
          </View>
          <View style={{position:'relative'}}>
            <NewPostsBubble visible={(newerFriends.data||0)>0} onPress={()=>{void openNewer(friendsQuery,'amigos');}}/>
            {renderTimeline(friendsQuery,'amigos','Quando seus amigos avaliarem obras, as avaliações aparecem aqui, das mais recentes.')}
          </View>
        </Pager>
      </>}
  </Screen>;
}


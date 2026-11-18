import React, { useCallback,useEffect,useState } from 'react';
import { Text,TextInput,View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { Categories,CatalogGrid } from '../../src/components/catalog';
import { TimelineTabs,TimelineList } from '../../src/components/feed';
import { Pager } from '../../src/components/pager';
import { searchMedia, MediaItem } from '../../src/features/catalog/data';
import { searchPublicCatalog, publicProviderCredit, publicCoverageLabel } from '../../src/features/catalog/public-search';
import { listDiscoverTimeline, listFriendsTimeline, setRatingLike, withLike, type FeedReview } from '../../src/features/feed/timelines';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';

type TimelineId = 'descobrir'|'amigos';
const TIMELINE_ORDER: TimelineId[] = ['descobrir','amigos'];

export default function Discover() {
  const [search,setSearch]=useState('');const [term,setTerm]=useState('');const [category,setCategory]=useState('');
  const [timeline,setTimeline]=useState<TimelineId>('descobrir');
  const [likedOverride,setLikedOverride]=useState<Record<string,FeedReview>>({});
  const [refreshing,setRefreshing]=useState(false);
  const {session}=useAuth();
  useEffect(()=>{const timer=setTimeout(()=>setTerm(search),300);return()=>clearTimeout(timer);},[search]);
  const searching=term.trim().length>=2;
  const query=useQuery({queryKey:['catalog',session?.user.id,term,category],queryFn:()=>searchMedia(term,category),enabled:!!supabase});
  const publicQuery=useQuery({
    queryKey:['public-catalog',term,category],
    queryFn:async()=>{
      const items=await searchPublicCatalog(term,category);
      return items.map((item):MediaItem=>({id:item.id,title:item.title,category:item.category,description:`${item.creator?item.creator+' · ':''}Fonte: ${item.source}`,cover_url:null,release_year:item.releaseYear,source_url:item.sourceUrl}));
    },
    enabled:!supabase&&searching,
    staleTime:10*60*1000,
  });
  const timelinesOn=!!supabase&&!!session&&!searching;
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
  const renderTimeline=(q:typeof discoverQuery,emptyText:string)=>{
    if(q.isPending)return <Text style={styles.body}>Carregando avaliações…</Text>;
    if(q.isError)return <Text style={styles.error}>Não foi possível carregar a timeline.</Text>;
    const reviews=applyOverrides(q.data);
    return reviews.length?<TimelineList reviews={reviews} onToggleLike={toggleLike}/>:<Text style={styles.body}>{emptyText}</Text>;
  };
  const updating=timelinesOn&&(discoverQuery.isRefetching||friendsQuery.isRefetching);
  return <Screen onRefresh={timelinesOn?onRefresh:undefined} refreshing={refreshing}><Text style={styles.eyebrow}>EXPLORAR</Text><Text style={styles.title}>Seu próximo favorito está por aí.</Text><TextInput accessibilityLabel="Buscar obras" placeholder="Busque séries, animes, livros…" style={styles.input} value={search} onChangeText={setSearch}/><Categories value={category} onChange={setCategory}/>
    {searching||!supabase||!session?<>
      {!supabase?<>
        <Text style={{...styles.body,color:'#5b6b70',fontSize:13}}>Busca pública ao vivo: {publicCoverageLabel()} · Fontes: {publicProviderCredit()} · Capas ilustradas, sem arte oficial</Text>
        {publicQuery.isPending?<Text style={styles.body}>Buscando em fontes públicas…</Text>:publicQuery.isError?<Text style={styles.body}>Busca pública indisponível agora.</Text>:publicQuery.data?.length?<CatalogGrid items={publicQuery.data}/>:searching?<Text style={styles.body}>Nenhum resultado público para essa busca.</Text>:null}
      </>:query.isPending?<Text style={styles.body}>Buscando descobertas…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar o catálogo.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:searching?<Text style={styles.body}>Nenhuma obra encontrada. O catálogo ainda pode estar vazio ou não há resultados para sua busca.</Text>:null}
      {!session&&supabase?<Text style={styles.body}>Entre para ver as timelines Descobrir e Amigos.</Text>:null}
    </>:<>
      <TimelineTabs value={timeline} onChange={setTimeline}/>
      {updating?<Text style={{...styles.body,fontSize:13}}>Atualizando…</Text>:null}
      <Pager index={TIMELINE_ORDER.indexOf(timeline)} onIndexChange={(i)=>setTimeline(TIMELINE_ORDER[i]||'descobrir')} accessibilityLabel="Timelines do Explorar">
        <View>{renderTimeline(discoverQuery,'Ainda não há avaliações públicas. As mais curtidas aparecem aqui.')}</View>
        <View>{renderTimeline(friendsQuery,'Quando seus amigos avaliarem obras, as avaliações aparecem aqui, das mais recentes.')}</View>
      </Pager>
    </>}
  </Screen>;
        }

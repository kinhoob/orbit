import React, { useEffect,useState } from 'react';
import { Text,TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { Categories,CatalogGrid } from '../../src/components/catalog';
import { TimelineTabs,TimelineList } from '../../src/components/feed';
import { searchMedia, MediaItem } from '../../src/features/catalog/data';
import { searchPublicCatalog, publicProviderCredit, publicCoverageLabel } from '../../src/features/catalog/public-search';
import { listDiscoverTimeline, listFriendsTimeline, setRatingLike, withLike, type FeedReview } from '../../src/features/feed/timelines';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
export default function Discover() {
  const [search,setSearch]=useState('');const [term,setTerm]=useState('');const [category,setCategory]=useState('');
  const [timeline,setTimeline]=useState<'descobrir'|'amigos'>('descobrir');
  const [likedOverride,setLikedOverride]=useState<Record<string,FeedReview>>({});
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
  const feedQuery=useQuery({
    queryKey:['timeline',timeline,session?.user.id],
    queryFn:()=>timeline==='descobrir'?listDiscoverTimeline(session!.user.id):listFriendsTimeline(session!.user.id),
    enabled:!!supabase&&!!session&&!searching,
  });
  const toggleLike=(review:FeedReview)=>{
    if(!session)return;
    const next=withLike(review,!review.liked_by_me);
    setLikedOverride((prev)=>({...prev,[review.rating_id]:next}));
    setRatingLike(review.rating_id,session.user.id,!review.liked_by_me).catch(()=>{
      setLikedOverride((prev)=>({...prev,[review.rating_id]:review}));
    });
  };
  const reviews=(feedQuery.data||[]).map((r)=>likedOverride[r.rating_id]||r);
  return <Screen><Text style={styles.eyebrow}>EXPLORAR</Text><Text style={styles.title}>Seu próximo favorito está por aí.</Text><TextInput accessibilityLabel="Buscar obras" placeholder="Busque séries, animes, livros…" style={styles.input} value={search} onChangeText={setSearch}/><Categories value={category} onChange={setCategory}/>
    {searching||!supabase||!session?<>
      {!supabase?<>
        <Text style={{...styles.body,color:'#5b6b70',fontSize:13}}>Busca pública ao vivo: {publicCoverageLabel()} · Fontes: {publicProviderCredit()} · Capas ilustradas, sem arte oficial</Text>
        {publicQuery.isPending?<Text style={styles.body}>Buscando em fontes públicas…</Text>:publicQuery.isError?<Text style={styles.body}>Busca pública indisponível agora.</Text>:publicQuery.data?.length?<CatalogGrid items={publicQuery.data}/>:searching?<Text style={styles.body}>Nenhum resultado público para essa busca.</Text>:null}
      </>:query.isPending?<Text style={styles.body}>Buscando descobertas…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar o catálogo.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:searching?<Text style={styles.body}>Nenhuma obra encontrada. O catálogo ainda pode estar vazio ou não há resultados para sua busca.</Text>:null}
      {!session&&supabase?<Text style={styles.body}>Entre para ver as timelines Descobrir e Amigos.</Text>:null}
    </>:<>
      <TimelineTabs value={timeline} onChange={setTimeline}/>
      {feedQuery.isPending?<Text style={styles.body}>Carregando avaliações…</Text>:feedQuery.isError?<Text style={styles.error}>Não foi possível carregar a timeline.</Text>:reviews.length?<TimelineList reviews={reviews} onToggleLike={toggleLike}/>:timeline==='amigos'?<Text style={styles.body}>Quando seus amigos avaliarem obras, as avaliações aparecem aqui, das mais recentes.</Text>:<Text style={styles.body}>Ainda não há avaliações públicas. As mais curtidas aparecem aqui.</Text>}
    </>}
  </Screen>;
}

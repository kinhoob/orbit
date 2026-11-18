import React, { useEffect,useState } from 'react';
import { Text,TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { Categories,CatalogGrid } from '../../src/components/catalog';
import { searchMedia, MediaItem } from '../../src/features/catalog/data';
import { searchPublicCatalog, PUBLIC_PROVIDER_CREDIT } from '../../src/features/catalog/public-search';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
export default function Discover() {
  const [search,setSearch]=useState('');const [term,setTerm]=useState('');const [category,setCategory]=useState('');
  const {session}=useAuth();
  useEffect(()=>{const timer=setTimeout(()=>setTerm(search),300);return()=>clearTimeout(timer);},[search]);
  const query=useQuery({queryKey:['catalog',session?.user.id,term,category],queryFn:()=>searchMedia(term,category),enabled:!!supabase});
  const publicQuery=useQuery({
    queryKey:['public-catalog',term,category],
    queryFn:async()=>{
      const items=await searchPublicCatalog(term,category);
      return items.map((item):MediaItem=>({id:item.id,title:item.title,category:item.category,description:`${item.creator?item.creator+' · ':''}Fonte: ${item.source}`,cover_url:null,release_year:item.releaseYear,source_url:item.sourceUrl}));
    },
    enabled:!supabase&&term.trim().length>=2,
    staleTime:10*60*1000,
  });
  return <Screen><Text style={styles.eyebrow}>DESCUBRIR</Text><Text style={styles.title}>Seu próximo favorito está por aí.</Text><TextInput accessibilityLabel="Buscar obras" placeholder="Busque séries, animes, livros…" style={styles.input} value={search} onChangeText={setSearch}/><Categories value={category} onChange={setCategory}/>
    {!supabase?<>
      <Text style={{...styles.body,color:'#5b6b70',fontSize:13}}>Busca pública ao vivo: séries, animes e livros · Fontes: {PUBLIC_PROVIDER_CREDIT} · Capas ilustradas, sem arte oficial</Text>
      {publicQuery.isPending?<Text style={styles.body}>Buscando em fontes públicas…</Text>:publicQuery.isError?<Text style={styles.body}>Busca pública indisponível agora.</Text>:publicQuery.data?.length?<CatalogGrid items={publicQuery.data}/>:term.trim().length>=2?<Text style={styles.body}>Nenhum resultado público para essa busca.</Text>:null}
    </>:query.isPending?<Text style={styles.body}>Buscando descobertas…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar o catálogo.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:<Text style={styles.body}>Nenhuma obra encontrada. O catálogo ainda pode estar vazio ou não há resultados para sua busca.</Text>}
  </Screen>;
}

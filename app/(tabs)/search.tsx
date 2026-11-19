import React, { useEffect,useState } from 'react';
import { Text,TextInput,View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { Categories,CatalogGrid } from '../../src/components/catalog';
import { MotionPressable } from '../../src/components/motion';
import { searchMedia, MediaItem } from '../../src/features/catalog/data';
import { searchPublicCatalog, publicProviderCredit, publicCoverageLabel } from '../../src/features/catalog/public-search';
import { searchProfiles } from '../../src/features/social/friends';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { tokens as t } from '../../src/design/tokens';

// Busca (arquitetura aprovada pelo Marco em 18/11/2026): sai de cima do feed e
// vira uma aba propria, com a lupa na barra de baixo. Busca obras e pessoas.
export default function Search() {
  const [search,setSearch]=useState('');const [term,setTerm]=useState('');const [category,setCategory]=useState('');
  const {session}=useAuth();
  const router=useRouter();
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
  const peopleQuery=useQuery({
    queryKey:['people-search',term],
    queryFn:()=>searchProfiles(term,session!.user.id),
    enabled:!!supabase&&!!session&&searching,
  });
  return <Screen>
    <TextInput accessibilityLabel="Buscar obras e pessoas" placeholder="Busque séries, animes, livros, pessoas…" style={styles.input} value={search} onChangeText={setSearch}/>
    <Categories value={category} onChange={setCategory}/>
    {!supabase?<>
      <Text style={{...styles.body,color:'#5b6b70',fontSize:13}}>Busca pública ao vivo: {publicCoverageLabel()} · Fontes: {publicProviderCredit()} · Capas ilustradas, sem arte oficial</Text>
      {!searching?<Text style={styles.body}>Digite para buscar obras em fontes públicas.</Text>:publicQuery.isPending?<Text style={styles.body}>Buscando em fontes públicas…</Text>:publicQuery.isError?<Text style={styles.body}>Busca pública indisponível agora.</Text>:publicQuery.data?.length?<CatalogGrid items={publicQuery.data}/>:<Text style={styles.body}>Nenhum resultado público para essa busca.</Text>}
    </>:<>
      {query.isPending?<Text style={styles.body}>Buscando descobertas…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar o catálogo.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:searching?<Text style={styles.body}>Nenhuma obra encontrada. O catálogo ainda pode estar vazio ou não há resultados para sua busca.</Text>:<Text style={styles.body}>Digite para buscar no catálogo ou escolha uma categoria.</Text>}
      {!!session&&searching&&peopleQuery.data&&peopleQuery.data.length>0?<View style={{gap:10}}>
        <Text style={styles.eyebrow}>PESSOAS</Text>
        {peopleQuery.data.map((person)=>{
          const name=person.display_name||person.username||'Sem nome';
          return <MotionPressable key={person.id} accessibilityRole="button" accessibilityLabel={`Ver ${name} em Amizades`} onPress={()=>router.push('/friends')} style={({pressed})=>[{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6},pressed&&{opacity:0.7}]}>
            <View style={{width:40,height:40,borderRadius:20,backgroundColor:t.colors.accent,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:16,fontWeight:'700',color:t.colors.accentStrong}}>{name.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:15,fontWeight:'600',color:t.colors.text}}>{name}</Text>
              {!!person.username&&<Text style={{fontSize:13,color:t.colors.muted}}>@{person.username}</Text>}
            </View>
          </MotionPressable>;
        })}
        <Text style={{...styles.body,fontSize:13,color:t.colors.muted}}>Pedidos de amizade são gerenciados na tela Amizades, na gaveta do Perfil.</Text>
      </View>:null}
      {!session?<Text style={styles.body}>Entre para buscar pessoas e ver as timelines do Explorar.</Text>:null}
    </>}
  </Screen>;
}

import React, { useEffect,useState } from 'react';
import { Text,TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { Categories,CatalogGrid,ConnectionNotice } from '../../src/components/catalog';
import { searchMedia } from '../../src/features/catalog/data';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
export default function Discover() {
  const [search,setSearch]=useState('');const [term,setTerm]=useState('');const [category,setCategory]=useState('');
  const {session}=useAuth();
  useEffect(()=>{const timer=setTimeout(()=>setTerm(search),300);return()=>clearTimeout(timer);},[search]);
  const query=useQuery({queryKey:['catalog',session?.user.id,term,category],queryFn:()=>searchMedia(term,category),enabled:!!supabase});
  return <Screen><Text style={styles.eyebrow}>DESCUBRIR</Text><Text style={styles.title}>Seu próximo favorito está por aí.</Text><TextInput accessibilityLabel="Buscar obras" placeholder="Busque filmes, álbuns, livros…" style={styles.input} value={search} onChangeText={setSearch}/><Categories value={category} onChange={setCategory}/>
    {!supabase?<ConnectionNotice/>:query.isPending?<Text style={styles.body}>Buscando descobertas…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar o catálogo.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:<Text style={styles.body}>Nenhuma obra encontrada. O catálogo ainda pode estar vazio ou não há resultados para sua busca.</Text>}
  </Screen>;
}

import React from 'react';
import { Text,View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { CatalogGrid } from '../../src/components/catalog';
import { Icon } from '../../src/components/icons';
import { tokens } from '../../src/design/tokens';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase } from '../../src/lib/supabase';
import type { MediaItem } from '../../src/features/catalog/data';
export default function Saved() {
  const {session,loading}=useAuth();
  const query=useQuery({queryKey:['saved',session?.user.id],enabled:!!session,queryFn:async()=>{
    const client=requireSupabase();const {data,error}=await client.from('saved_items').select('media_item_id').eq('user_id',session!.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;
    const ids=(data || []).map(row=>row.media_item_id as string);if(!ids.length)return [];
    const result=await client.from('media_items').select('*').in('id',ids);if(result.error)throw result.error;
    return ids.map(id=>(result.data as MediaItem[]).find(item=>item.id===id)).filter((item):item is MediaItem=>!!item);
  }});
  return <Screen><Text style={styles.eyebrow}>SUA BIBLIOTECA</Text><Text style={styles.title}>Guarde para o momento certo.</Text><Text style={styles.body}>Seus salvos são privados. Até 100 obras recentes aparecem aqui.</Text>
    {loading?<Text style={styles.body}>Carregando sessão…</Text>:!session?<Link href="/auth" style={styles.link}>Entre para acessar seus salvos →</Link>:query.isPending?<Text style={styles.body}>Carregando sua biblioteca…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar seus salvos.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:query.data?.length?<CatalogGrid items={query.data}/>:<View style={{gap:16}}><View style={{width:72,height:72,borderRadius:36,backgroundColor:tokens.colors.secondary,alignItems:'center',justifyContent:'center'}}><Icon name="bookmark" size={30} color={tokens.colors.muted} /></View><Text style={styles.body}>Sua próxima descoberta ainda não está aqui. Salve uma obra para encontrá-la depois.</Text><Link href="/(tabs)/discover" style={styles.link}>Encontrar algo novo →</Link></View>}
  </Screen>;
}

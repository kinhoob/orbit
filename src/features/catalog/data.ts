import { requireSupabase } from '../../lib/supabase';
export const categories = [
  {id:'film',label:'Filmes'},{id:'series',label:'Séries'},{id:'anime',label:'Animes'},
  {id:'music',label:'Músicas'},{id:'album',label:'Álbuns'},{id:'book',label:'Livros'},{id:'game',label:'Jogos'},
] as const;
export type MediaItem = {id:string;title:string;category:string;description:string;cover_url:string|null;release_year:number|null;source_url?:string|null};
export async function searchMedia(search:string,category?:string):Promise<MediaItem[]> {
  let query=requireSupabase().from('media_items').select('id,title,category,description,cover_url,release_year').order('title').limit(40);
  const term=search.trim().replace(/[%_\\]/g,'');
  if(term)query=query.ilike('title',`%${term}%`);
  if(category)query=query.eq('category',category);
  const {data,error}=await query; if(error)throw error;return data || [];
}

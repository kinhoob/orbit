import React from 'react';
import { MotionPressable, CardEntrance } from './motion';
import { Icon } from './icons';
import { Image, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { categories, type MediaItem } from '../features/catalog/data';
import { styles } from './ui';
import { tokens } from '../design/tokens';
export function Categories({value,onChange,compact=false}:{value:string;onChange:(value:string)=>void;compact?:boolean}) {
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[{id:'',label:'Tudo'},...categories].map(category=><MotionPressable key={category.id} accessibilityRole="button" accessibilityState={{selected:value===category.id}} onPress={()=>onChange(category.id)} style={{paddingHorizontal:compact?13:16,paddingVertical:compact?8:10,borderRadius:24,backgroundColor:value===category.id?tokens.colors.accentStrong:tokens.colors.secondary}}><Text style={{color:value===category.id?'#fff':tokens.colors.text,fontSize:compact?14:15}}>{category.label}</Text></MotionPressable>)}</View>;
}
export function MediaCard({item}:{item:MediaItem}) {
  return <Link href={{pathname:'/media/[id]',params:{id:item.id}}} asChild><MotionPressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} style={{width:'100%',backgroundColor:tokens.colors.surface,borderRadius:18,overflow:'hidden'}}>
    {item.cover_url ? <Image source={{uri:item.cover_url}} style={{width:'100%',aspectRatio:item.category==='album'?1:0.7}} accessibilityLabel={`Capa de ${item.title}`} /> : <View style={{height:170,backgroundColor:tokens.colors.secondary,justifyContent:'center',alignItems:'center',gap:8}}><Icon name="image" size={34} color={tokens.colors.muted} /><Text style={styles.body}>Sem capa</Text></View>}
    <View style={{padding:14,gap:6}}><Text style={{fontSize:16,fontWeight:'600',color:tokens.colors.text}}>{item.title}</Text><Text style={{color:tokens.colors.muted,fontSize:12}}>{categories.find(c=>c.id===item.category)?.label || 'Outros'}{item.release_year?` · ${item.release_year}`:''}</Text></View>
  </MotionPressable></Link>;
}
export function CatalogGrid({items}:{items:MediaItem[]}) {return <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{items.map((item,index)=><CardEntrance key={item.id} index={index} style={{width:'48%'}}><MediaCard item={item}/></CardEntrance>)}</View>;}
export function ConnectionNotice() {return <View style={styles.card}><Text style={styles.eyebrow}>VAMOS COMEÇAR</Text><Text style={styles.body}>O catálogo estará disponível assim que a conexão com o ORBIT for configurada.</Text></View>;}

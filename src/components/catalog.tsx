import { IllustratedCover } from './mural';
import React from 'react';
import { MotionPressable, CardEntrance } from './motion';
import { Icon } from './icons';
import { Image, Linking, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { categories, type MediaItem } from '../features/catalog/data';
import { styles } from './ui';
import { tokens, font} from '../design/tokens';
export function Categories({value,onChange,compact=false}:{value:string;onChange:(value:string)=>void;compact?:boolean}) {
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[{id:'',label:'Tudo'},...categories].map(category=><MotionPressable key={category.id} accessibilityRole="button" accessibilityState={{selected:value===category.id}} onPress={()=>onChange(category.id)} style={{paddingHorizontal:compact?13:16,paddingVertical:compact?8:10,borderRadius:999,backgroundColor:value===category.id?tokens.colors.primary:tokens.colors.secondary}}><Text style={{color:value===category.id?tokens.colors.onDark:tokens.colors.text,fontSize:compact?14:15,fontFamily:value===category.id?font.semibold:font.regular}}>{category.label}</Text></MotionPressable>)}</View>;
}
export function MediaCard({item}:{item:MediaItem}) {
  const body=<>
    {item.cover_url ? <Image source={{uri:item.cover_url}} style={{width:'100%',aspectRatio:item.category==='album'?1:0.7}} accessibilityLabel={`Capa de ${item.title}`} /> : <IllustratedCover category={item.category} aspectRatio={item.category==='album'?1:0.7} />}
    <View style={{padding:14,gap:6}}><Text style={{fontSize:16,fontFamily: font.semibold,color:tokens.colors.text}}>{item.title}</Text><Text style={{color:tokens.colors.muted,fontSize:12}}>{item.creator?`${item.creator} · `:''}{categories.find(c=>c.id===item.category)?.label || 'Outros'}{item.release_year?` · ${item.release_year}`:''}</Text>{item.description?<Text style={{color:tokens.colors.muted,fontSize:12}}>{item.description}</Text>:null}</View>
  </>;
  const cardStyle={width:'100%',backgroundColor:tokens.colors.surface,borderRadius:20,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,20,15,0.06)',elevation:1} as const;
  if(item.source_url){
    return <MotionPressable accessibilityRole="link" accessibilityLabel={`${item.title}, abrir fonte`} onPress={()=>{void Linking.openURL(item.source_url!);}} style={cardStyle}>{body}</MotionPressable>;
  }
  return <Link href={{pathname:'/media/[id]',params:{id:item.id}}} asChild><MotionPressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} style={cardStyle}>{body}</MotionPressable></Link>;
}
export function CatalogGrid({items}:{items:MediaItem[]}) {return <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{items.map((item,index)=><CardEntrance key={item.id} index={index} style={{width:'48%'}}><MediaCard item={item}/></CardEntrance>)}</View>;}

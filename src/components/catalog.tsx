import { IllustratedCover } from './mural';
import React, { useState } from 'react';
import { MotionPressable, CardEntrance } from './motion';
import { Image, Linking, Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { categories, type MediaItem } from '../features/catalog/data';
import { tokens, font} from '../design/tokens';
export function Categories({value,onChange,compact=false}:{value:string;onChange:(value:string)=>void;compact?:boolean}) {
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[{id:'',label:'Tudo'},...categories].map(category=><MotionPressable key={category.id} accessibilityRole="button" accessibilityState={{selected:value===category.id}} onPress={()=>onChange(category.id)} style={{paddingHorizontal:compact?13:16,paddingVertical:compact?8:10,borderRadius:999,backgroundColor:value===category.id?tokens.colors.primary:tokens.colors.secondary}}><Text style={{color:value===category.id?tokens.colors.onDark:tokens.colors.text,fontSize:compact?14:15,fontFamily:value===category.id?font.semibold:font.regular}}>{category.label}</Text></MotionPressable>)}</View>;
}
export function MediaCard({item}:{item:MediaItem}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const { fontScale } = useWindowDimensions();
  const categoryLabel = categories.find(c=>c.id===item.category)?.label || 'Outros';
  const cover=item.cover_url && !failed
    ? <Image source={{uri:item.cover_url}} resizeMode="cover" onError={()=>setFailed(true)} style={{width:'100%',aspectRatio:1}} accessibilityLabel={`Capa de ${item.title}`} />
    : <IllustratedCover category={item.category} aspectRatio={1} />;
  const body=<>
    {cover}
    <View style={{padding:12,gap:4}}>
      <Text numberOfLines={2} ellipsizeMode="tail" style={{height:40*fontScale,lineHeight:20,fontSize:15,fontFamily:font.semibold,color:tokens.colors.text}}>{item.title}</Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={{height:17*fontScale,lineHeight:17,fontSize:12,color:tokens.colors.muted}}>{item.creator || ' '}</Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={{height:16*fontScale,lineHeight:16,fontSize:11,color:tokens.colors.muted}}>{categoryLabel}{item.release_year ? ` · ${item.release_year}` : ''}</Text>
    </View>
  </>;
  const cardStyle={width:'100%',backgroundColor:tokens.colors.surface,borderRadius:20,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,20,15,0.06)',elevation:1} as const;
  if(item.source_url){
    return <>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} onPress={()=>setDetailsOpen(true)} style={cardStyle}>{body}</MotionPressable>
      <Modal visible={detailsOpen} transparent animationType="none" onRequestClose={()=>setDetailsOpen(false)}>
        <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,0.6)'}}>
          <ScrollView accessibilityViewIsModal style={{width:'100%',maxWidth:440,maxHeight:'90%',flexGrow:0,alignSelf:'center',borderRadius:24,backgroundColor:tokens.colors.surface}} contentContainerStyle={{padding:24,gap:16}}>
            <Text accessibilityRole="header" style={{fontSize:24,fontFamily:font.bold,color:tokens.colors.text}}>{item.title}</Text>
            <Text style={{color:tokens.colors.muted}}>{[item.creator,categories.find(c=>c.id===item.category)?.label,item.release_year].filter(Boolean).join(' · ')}</Text>
            {item.description ? <Text style={{color:tokens.colors.text}}>{item.description}</Text> : null}
            <MotionPressable accessibilityRole="link" onPress={()=>{void Linking.openURL(item.source_url!);}} style={{padding:14,borderRadius:16,backgroundColor:tokens.colors.primary}}><Text style={{textAlign:'center',color:tokens.colors.onDark,fontFamily:font.semibold}}>Abrir fonte</Text></MotionPressable>
            <MotionPressable accessibilityRole="button" onPress={()=>setDetailsOpen(false)} style={{padding:12}}><Text style={{textAlign:'center',color:tokens.colors.text}}>Fechar</Text></MotionPressable>
          </ScrollView>
        </View>
      </Modal>
    </>;
  }
  return <Link href={{pathname:'/media/[id]',params:{id:item.id}}} asChild><MotionPressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} style={cardStyle}>{body}</MotionPressable></Link>;
}
export function CatalogGrid({items}:{items:MediaItem[]}) {
  return <View style={{gap:12}}>{Array.from({length:Math.ceil(items.length/2)},(_,row)=><View key={items[row*2]!.id} style={{flexDirection:'row',gap:12}}>
    {items.slice(row*2,row*2+2).map((item,column)=><CardEntrance key={item.id} index={row*2+column} style={{flex:1,minWidth:0}}><MediaCard item={item}/></CardEntrance>)}
    {row*2+1>=items.length && <View style={{flex:1,minWidth:0}}/>}
  </View>)}</View>;
}


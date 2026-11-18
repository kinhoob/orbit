import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { tokens } from '../../src/design/tokens';
export default function MainTabs() {
  return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:tokens.colors.primary,tabBarInactiveTintColor:tokens.colors.muted,tabBarStyle:{backgroundColor:tokens.colors.surface,borderTopColor:tokens.colors.border,height:76,paddingBottom:14,paddingTop:8},tabBarLabelStyle:{fontSize:12}}}>
    {([{name:'index',title:'Início',icon:'◉'},{name:'discover',title:'Descobrir',icon:'◎'},{name:'create',title:'Criar',icon:'＋'},{name:'saved',title:'Salvos',icon:'▤'},{name:'profile',title:'Perfil',icon:'○'}]).map(tab=><Tabs.Screen key={tab.name} name={tab.name} options={{title:tab.title,tabBarIcon:({color})=><Text style={{color,fontSize:25}}>{tab.icon}</Text>}}/>)}
  </Tabs>;
}

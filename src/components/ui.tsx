import React from 'react';
import { MotionPressable, ScreenMotion } from './motion';
import { useWebPullToRefresh } from './pull-to-refresh';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { tokens as t } from '../design/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export function Screen({children,maxWidth=560,onRefresh,refreshing=false,scrollRef}:React.PropsWithChildren<{maxWidth?:number;onRefresh?:()=>void;refreshing?:boolean;scrollRef?:React.RefObject<React.ComponentRef<typeof ScrollView>|null>}>) {
  const insets = useSafeAreaInsets();
  // Nativo: RefreshControl padrao para o GESTO, com spinner transparente de
  // proposito — a bolinha de carregar aparece na linha "Atualizando…" abaixo
  // das abas (pedido do Marco em 18/11/2026), sem spinner duplicado. Web: gesto
  // de puxar proprio (o RefreshControl do react-native-web e um stub sem gesto).
  const pull = useWebPullToRefresh(refreshing,onRefresh);
  const scroll=<ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" onScroll={pull.enabled?pull.onScroll:undefined} scrollEventThrottle={pull.enabled?16:undefined} contentContainerStyle={[styles.screen,{paddingTop:Math.max(insets.top+24,48),paddingBottom:Math.max(insets.bottom+24,32)}]} refreshControl={!pull.enabled&&onRefresh?<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent"/>:undefined}><ScreenMotion testID="screen-motion" style={[styles.content,{maxWidth}]}>{children}</ScreenMotion></ScrollView>;
  if(!pull.enabled) return scroll;
  return <View style={styles.pullRoot} {...pull.panHandlers}>
    <Animated.View pointerEvents="none" style={[styles.pullIndicator,{opacity:pull.pull.interpolate({inputRange:[0,24,48],outputRange:[0,0.35,1],extrapolate:'clamp'})}]}>
      <View style={styles.pullSpinner}><Icon name="arrow-down" size={18} color={t.colors.accentStrong}/></View>
    </Animated.View>
    <Animated.View style={[styles.pullContent,{transform:[{translateY:pull.pull}]}]}>{scroll}</Animated.View>
  </View>;
}
export function Button({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}) {
  return <MotionPressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.button,disabled && {opacity:0.5}]}><Text style={styles.buttonText}>{label}</Text></MotionPressable>;
}
export const styles = StyleSheet.create({
  screen:{flexGrow:1,backgroundColor:t.colors.background,padding:24,paddingTop:64},
  content:{width:'100%',maxWidth:560,alignSelf:'center',gap:18},
  eyebrow:{fontSize:14,letterSpacing:4,fontWeight:'700',color:t.colors.muted},
  title:{fontSize:38,fontWeight:'700',lineHeight:44,color:t.colors.text},
  body:{fontSize:16,lineHeight:25,color:t.colors.muted},
  card:{padding:24,borderRadius:t.radius,backgroundColor:t.colors.surface,gap:16},
  input:{borderWidth:1,borderColor:t.colors.border,borderRadius:12,padding:16,fontSize:16,color:t.colors.text,backgroundColor:t.colors.surface},
  button:{backgroundColor:t.colors.primary,padding:17,borderRadius:12,alignItems:'center'},
  buttonText:{color:'#FFFFFF',fontSize:16,fontWeight:'600'},
  link:{color:t.colors.accentStrong,fontSize:16,paddingVertical:10},
  buttonOutline:{borderWidth:1,borderColor:t.colors.border,borderRadius:12,padding:15,alignItems:'center',backgroundColor:t.colors.surface},
  buttonOutlineText:{color:t.colors.text,fontSize:16,fontWeight:'600'},
  error:{color:t.colors.error,lineHeight:22},
  pullRoot:{flex:1},
  pullContent:{flex:1},
  pullIndicator:{position:'absolute',top:8,left:0,right:0,alignItems:'center',zIndex:2},
  pullSpinner:{backgroundColor:t.colors.surface,borderWidth:1,borderColor:t.colors.border,borderRadius:20,padding:8},
});

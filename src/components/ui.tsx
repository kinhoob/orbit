import React from 'react';
import { MotionPressable, ScreenMotion } from './motion';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { tokens as t } from '../design/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export function Screen({children,maxWidth=560}:React.PropsWithChildren<{maxWidth?:number}>) {
  const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screen,{paddingTop:Math.max(insets.top+24,48),paddingBottom:Math.max(insets.bottom+24,32)}]}><ScreenMotion testID="screen-motion" style={[styles.content,{maxWidth}]}>{children}</ScreenMotion></ScrollView>;
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
});

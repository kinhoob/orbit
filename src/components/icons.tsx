import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Ícones de linha consistentes (traço único, grade 24x24, estilo Feather), idênticos na web e no nativo via react-native-svg. */
export type IconName =
  | 'home' | 'compass' | 'plus' | 'bookmark' | 'user'
  | 'film' | 'tv' | 'music' | 'book' | 'game'
  | 'search' | 'edit' | 'image' | 'heart' | 'arrow-up' | 'arrow-down' | 'bell'
  | 'eye' | 'eye-off';

type Stroke = ['path' | 'circle' | 'rect', Record<string, string | number>];

const STROKES: Record<IconName, Stroke[]> = {
  home: [['path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }], ['path', { d: 'M9 22V12h6v10' }]],
  compass: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  bookmark: [['path', { d: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' }]],
  user: [['path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }], ['circle', { cx: 12, cy: 7, r: 4 }]],
  film: [['rect', { x: 2, y: 2, width: 20, height: 20, rx: 2.18 }], ['path', { d: 'M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5' }]],
  tv: [['rect', { x: 2, y: 7, width: 20, height: 15, rx: 2 }], ['path', { d: 'M17 2l-5 5-5-5' }]],
  music: [['path', { d: 'M9 18V5l12-2v13' }], ['circle', { cx: 6, cy: 18, r: 3 }], ['circle', { cx: 18, cy: 16, r: 3 }]],
  book: [['path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }], ['path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }]],
  game: [['path', { d: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.68-7.26A4 4 0 0 0 17.32 5z' }]],
  search: [['circle', { cx: 11, cy: 11, r: 8 }], ['path', { d: 'M21 21l-4.35-4.35' }]],
  edit: [['path', { d: 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' }]],
  image: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ['circle', { cx: 8.5, cy: 8.5, r: 1.5 }], ['path', { d: 'M21 15l-5-5L5 21' }]],
  heart: [['path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }]],
  'arrow-up': [['path', { d: 'M12 19V5' }], ['path', { d: 'M5 12l7-7 7 7' }]],
  'arrow-down': [['path', { d: 'M12 5v14' }], ['path', { d: 'M19 12l-7 7-7-7' }]],
  bell: [['path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }], ['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }]],
  eye: [['path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  'eye-off': [['path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }], ['path', { d: 'M1 1l22 22' }]],
};

/** Marca do ORBIT: anel creme com ponto dourado em órbita (versão estática, para o topo escuro das telas). */
export function OrbitMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={24} cy={24} r={16} stroke="#F4EFE7" strokeWidth={2.5} />
      <Circle cx={24} cy={8} r={4.5} fill="#E8C554" />
    </Svg>
  );
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      {STROKES[name].map(([tag, attrs], index) => {
        if (tag === 'circle') return <Circle key={index} {...(attrs as { cx: number; cy: number; r: number })} />;
        if (tag === 'rect') return <Rect key={index} {...(attrs as { x: number; y: number; width: number; height: number; rx?: number })} />;
        return <Path key={index} {...(attrs as { d: string })} />;
      })}
    </Svg>
  );
}

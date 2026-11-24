import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Ícones de linha consistentes (traço único, grade 24x24, estilo Feather), idênticos na web e no nativo via react-native-svg. */
export type IconName =
  | 'home' | 'compass' | 'plus' | 'bookmark' | 'user'
  | 'film' | 'tv' | 'music' | 'book' | 'game'
  | 'search' | 'edit' | 'image' | 'heart' | 'arrow-up' | 'arrow-down' | 'bell'
  | 'eye' | 'eye-off' | 'mail' | 'check' | 'flag' | 'menu' | 'send'
  | 'ellipsis' | 'smile' | 'bell-off' | 'camera'
  | 'star' | 'sparkles' | 'medal' | 'flame' | 'trophy' | 'crown'
  | 'users' | 'megaphone' | 'library' | 'orbit' | 'gem';

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
  camera: [['path', { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }], ['circle', { cx: 12, cy: 13, r: 4 }]],
  heart: [['path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }]],
  'arrow-up': [['path', { d: 'M12 19V5' }], ['path', { d: 'M5 12l7-7 7 7' }]],
  'arrow-down': [['path', { d: 'M12 5v14' }], ['path', { d: 'M19 12l-7 7-7-7' }]],
  bell: [['path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }], ['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }]],
  eye: [['path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  'eye-off': [['path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }], ['path', { d: 'M1 1l22 22' }]],
  mail: [['rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }], ['path', { d: 'M22 6l-10 7L2 6' }]],
  check: [['path', { d: 'M20 6L9 17l-5-5' }]],
  flag: [['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }], ['path', { d: 'M4 22v-7' }]],
  menu: [['path', { d: 'M4 6h16' }], ['path', { d: 'M4 12h16' }], ['path', { d: 'M4 18h16' }]],
  send: [['path', { d: 'M22 2L11 13' }], ['path', { d: 'M22 2l-7 20-4-9-9-4 20-7z' }]],
  ellipsis: [['circle', { cx: 5, cy: 12, r: 1 }], ['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 19, cy: 12, r: 1 }]],
  smile: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M8 14s1.5 2 4 2 4-2 4-2' }], ['path', { d: 'M9 9h.01' }], ['path', { d: 'M15 9h.01' }]],
  'bell-off': [['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }], ['path', { d: 'M18.63 13A17.89 17.89 0 0 1 18 8' }], ['path', { d: 'M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14' }], ['path', { d: 'M18 8a6 6 0 0 0-9.33-5' }], ['path', { d: 'M1 1l22 22' }]],
  star: [['path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }]],
  sparkles: [['path', { d: 'M9.94 15.5a2 2 0 0 0-1.44-1.44L2.37 12.49a.5.5 0 0 1 0-.96l6.13-1.58A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.45l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.57a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z' }], ['path', { d: 'M20 3v4' }], ['path', { d: 'M22 5h-4' }], ['path', { d: 'M4 17v2' }], ['path', { d: 'M5 18H3' }]],
  medal: [['path', { d: 'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15' }], ['path', { d: 'M11 12 5.12 2.2' }], ['path', { d: 'm13 12 5.88-9.8' }], ['path', { d: 'M8 7h8' }], ['circle', { cx: 12, cy: 17, r: 5 }], ['path', { d: 'M12 18v-2h-.5' }]],
  flame: [['path', { d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' }]],
  trophy: [['path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }], ['path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }], ['path', { d: 'M4 22h16' }], ['path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }], ['path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }], ['path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }]],
  crown: [['path', { d: 'M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.66a1 1 0 0 0 1.52-.29z' }], ['path', { d: 'M5 21h14' }]],
  users: [['path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
  megaphone: [['path', { d: 'm3 11 18-5v12L3 14v-3z' }], ['path', { d: 'M11.6 16.8a3 3 0 1 1-5.8-1.6' }]],
  library: [['path', { d: 'm16 6 4 14' }], ['path', { d: 'M12 6v14' }], ['path', { d: 'M8 8v12' }], ['path', { d: 'M4 4v16' }]],
  orbit: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 3, r: 2 }]],
  gem: [['path', { d: 'M6 3h12l4 6-10 13L2 9Z' }], ['path', { d: 'M11 3 8 9l4 13 4-13-3-6' }], ['path', { d: 'M2 9h20' }]],
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

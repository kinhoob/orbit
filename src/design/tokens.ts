// Linguagem visual aprovada pelo Marco em 19/11/2026 (referência: app do
// Filipe Marques, adaptada à identidade do ORBIT): fundo carvão, painel creme,
// cards claros de cantos bem arredondados, barra inferior flutuante escura,
// tipografia editorial (Inter) e destaques tingidos pela cor da obra.

/** Temas de perfil desbloqueáveis (Personalizar). O neutro segue a identidade nova. */
export const palettes = {
  neutral: { background: '#F4EFE7', surface: '#FDFBF7', primary: '#17140F', secondary: '#EAE3D6', accent: '#E8C554' },
  sky: { background: '#EDF2F8', surface: '#FFFFFF', primary: '#1D3560', secondary: '#DBE5F2', accent: '#A8C4F0' },
  softYellow: { background: '#FBF3DC', surface: '#FFFCF2', primary: '#39372F', secondary: '#F3E7C0', accent: '#EBC85C' },
};

/** Famílias Inter carregadas no app/_layout.tsx (expo-font). */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const tokens = {
  colors: {
    ...palettes.neutral,
    /** Zona escura fixa: topo das telas, barra flutuante, gaveta. */
    dark: '#201D19',
    darkSoft: '#2C2822',
    onDark: '#F4EFE7',
    onDarkMuted: 'rgba(244,239,231,0.55)',
    text: '#17140F',
    muted: '#8A8378',
    border: '#E4DCCC',
    success: '#226344',
    warning: '#805B10',
    error: '#A33232',
    /** Tinta: botões, chips de nota e ícone ativo. */
    accentStrong: '#17140F',
    /** Dourado de registro (pontinhos do calendário, detalhes). */
    gold: '#E8C554',
  },
  spacing: { xs: 6, sm: 12, md: 20, lg: 32, xl: 48 },
  radius: 24,
};

/** Tom profundo do cabeçalho da Início, derivado da categoria da obra do dia. */
export const headerTint: Record<string, string> = {
  film: '#4A3628',
  series: '#2E4A3F',
  anime: '#4E3550',
  music: '#1D3560',
  album: '#1D3560',
  book: '#4A3B2C',
  game: '#2F3E5C',
};

export const palettes = {
  neutral: { background: '#FAFAF7', surface: '#FFFFFF', primary: '#252A30', secondary: '#ECEEEB', accent: '#DDE8F0' },
  sky: { background: '#F3F8FC', surface: '#FFFFFF', primary: '#263E51', secondary: '#E4EEF6', accent: '#C9E3F5' },
  softYellow: { background: '#FFFCF2', surface: '#FFFFFF', primary: '#39372F', secondary: '#F5EED6', accent: '#F4E2A5' },
};
export const tokens = {
  colors: { ...palettes.neutral, text: '#24292F', muted: '#626B73', border: '#DCE0E2', success: '#226344', warning: '#805B10', error: '#A33232' },
  spacing: { xs: 6, sm: 12, md: 20, lg: 32, xl: 48 }, radius: 18,
};

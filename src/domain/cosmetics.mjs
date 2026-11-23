// Regras puras da personalização por nível (pedido do Marco em 23/11/2026).
// Espelha o catálogo da migration 20261123040000 — o banco é a fonte
// autoritativa; aqui ficam as mesmas definições para testes e para travar
// escolhas sem rede. Nível e XP vêm do account_progress; nada é inventado.

export const LEVELS = [
  { level: 1, title: 'Iniciante', required_xp: 0 },
  { level: 2, title: 'Explorador', required_xp: 50 },
  { level: 3, title: 'Curioso', required_xp: 120 },
  { level: 4, title: 'Descobridor', required_xp: 220 },
  { level: 5, title: 'Colecionador', required_xp: 350 },
  { level: 6, title: 'Entusiasta', required_xp: 500 },
  { level: 7, title: 'Conhecedor', required_xp: 750 },
  { level: 8, title: 'Especialista', required_xp: 1100 },
  { level: 9, title: 'Visionário', required_xp: 1600 },
  { level: 10, title: 'Lenda', required_xp: 2300 },
];

export const COSMETIC_KINDS = [
  { id: 'theme', label: 'Temas' },
  { id: 'button', label: 'Botões' },
  { id: 'animation', label: 'Animações' },
  { id: 'frame', label: 'Molduras' },
  { id: 'badge', label: 'Emblemas' },
];

export const COSMETICS = [
  { kind: 'theme', id: 'neutral', name: 'Minimalista', min_level: 1 },
  { kind: 'theme', id: 'sky', name: 'Céu', min_level: 2 },
  { kind: 'theme', id: 'softYellow', name: 'Sol suave', min_level: 2 },
  { kind: 'theme', id: 'forest', name: 'Mata', min_level: 3 },
  { kind: 'theme', id: 'blossom', name: 'Flor de cajueiro', min_level: 4 },
  { kind: 'theme', id: 'royal', name: 'Real', min_level: 6 },
  { kind: 'frame', id: 'none', name: 'Sem moldura', min_level: 1 },
  { kind: 'frame', id: 'line', name: 'Órbita', min_level: 2 },
  { kind: 'frame', id: 'double', name: 'Explorador', min_level: 3 },
  { kind: 'badge', id: 'none', name: 'Sem emblema', min_level: 1 },
  { kind: 'badge', id: 'explorer', name: 'Explorador', min_level: 2 },
  { kind: 'badge', id: 'collector', name: 'Colecionador', min_level: 2 },
  { kind: 'button', id: 'ink', name: 'Tinta', min_level: 1 },
  { kind: 'button', id: 'gold', name: 'Dourado', min_level: 3 },
  { kind: 'button', id: 'forest', name: 'Mata', min_level: 4 },
  { kind: 'button', id: 'wine', name: 'Vinho', min_level: 5 },
  { kind: 'animation', id: 'none', name: 'Sem animação', min_level: 1 },
  { kind: 'animation', id: 'float', name: 'Flutuar', min_level: 2 },
  { kind: 'animation', id: 'sway', name: 'Balanço', min_level: 3 },
  { kind: 'animation', id: 'pulse', name: 'Pulso', min_level: 4 },
  { kind: 'animation', id: 'glow', name: 'Halo', min_level: 5 },
  { kind: 'animation', id: 'shimmer', name: 'Brilho', min_level: 6 },
  { kind: 'animation', id: 'comet', name: 'Cometa', min_level: 7 },
  { kind: 'animation', id: 'orbit', name: 'Órbita viva', min_level: 8 },
  { kind: 'animation', id: 'aurora', name: 'Aurora', min_level: 9 },
];

const BY_KIND_ID = new Map(COSMETICS.map((c) => [`${c.kind}:${c.id}`, c]));

export function cosmeticById(kind, id) {
  return BY_KIND_ID.get(`${kind}:${id}`) || null;
}

/** Nível da conta para um total de XP (espelha level_definitions). */
export function levelForXp(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (level.required_xp <= total) current = level; else break;
  }
  return current;
}

/** Escolhas válidas e destravadas; devolve o primeiro problema ou null. */
export function cosmeticLock(kind, id, level) {
  const cosmetic = cosmeticById(kind, id);
  if (!cosmetic) return 'unknown';
  return cosmetic.min_level <= level ? null : cosmetic.min_level;
}

/** Cores dos botões do perfil por tema de botão. Contraste testado no claro. */
export const BUTTON_THEMES = {
  ink: { bg: '#17140F', fg: '#F4EFE7' },
  gold: { bg: '#E8C554', fg: '#17140F' },
  forest: { bg: '#2E4B3F', fg: '#F4EFE7' },
  wine: { bg: '#6E2434', fg: '#F4EFE7' },
};

export function buttonColorsFor(id) {
  return BUTTON_THEMES[id] || BUTTON_THEMES.ink;
}

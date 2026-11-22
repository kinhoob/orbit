/** Entry animation: a short branded opening, then the information appears. Reduced motion skips it entirely. */
export function introSpec(reduced) {
  return {
    orbitDuration: reduced ? 0 : 1600,
    wordDelay: reduced ? 0 : 220,
    wordDuration: reduced ? 0 : 420,
    minVisible: reduced ? 0 : 1800,
    fadeOut: reduced ? 0 : 320,
  };
}

/** Small, finite motion budget. No animation while preference is unknown/reduced. */
export function motionSpec(reduced, index = 0) {
  const card = Number.isInteger(index) && index >= 0 && index < 8;
  return {
    screenDuration: reduced ? 0 : 220,
    screenDistance: reduced ? 0 : 14,
    cardDuration: reduced || !card ? 0 : 260,
    cardDelay: reduced || !card ? 0 : index * 24,
  };
}

/** Fundo ambiente (escolha de gostos e acesso): poucos orbes grandes, deriva
// lenta e só em transform/opacidade. Movimento reduzido desliga os orbes. */
export function ambientOrbs(reduced) {
  if (reduced) return [];
  return [
    { size: 260, color: 'rgba(232,197,84,0.10)', opacity: 0.9, left: -80, top: -60, dx: 46, dy: 34, duration: 9000, delay: 0 },
    { size: 190, color: 'rgba(244,239,231,0.07)', opacity: 0.8, left: 260, top: 90, dx: -38, dy: 52, duration: 11000, delay: 900 },
    { size: 130, color: 'rgba(232,197,84,0.14)', opacity: 0.85, left: 40, top: 420, dx: 30, dy: -44, duration: 10000, delay: 400 },
    { size: 220, color: 'rgba(44,40,34,0.9)', opacity: 0.9, left: 210, top: 560, dx: -34, dy: -30, duration: 12000, delay: 1500 },
    { size: 90, color: 'rgba(232,197,84,0.18)', opacity: 0.8, left: 300, top: 330, dx: 24, dy: 26, duration: 8000, delay: 2200 },
    { size: 60, color: 'rgba(244,239,231,0.10)', opacity: 0.75, left: 130, top: 190, dx: -20, dy: 22, duration: 7500, delay: 600 },
  ];
}

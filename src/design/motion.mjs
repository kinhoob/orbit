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

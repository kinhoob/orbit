/** Lista de conversas silenciadas (sem ordem garantida na entrada). */
export function toggleMuted(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function isMuted(list, id) {
  return list.includes(id);
}

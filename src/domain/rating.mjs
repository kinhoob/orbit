export function parseScore(value) {
  const text = value.trim().replace(',', '.');
  if (!/^(?:\d{1,2})(?:\.\d)?$/.test(text)) return null;
  const score = Number(text);
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
}

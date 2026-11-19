/** Preserve reading order during background count updates. Missing rows
 * disappear immediately (including rows removed by RLS). New rows wait for
 * an explicit refresh; callers provide a new id list when accepting updates. */
export function inReadingOrder(ids, rows) {
  const byId = new Map(rows.map(row => [row.rating_id, row]));
  return ids.map(id => byId.get(id)).filter(Boolean);
}

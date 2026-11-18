export function relationWith(friendships, userId, otherId) {
  const match = friendships.find(
    (f) => (f.requester_id === userId && f.addressee_id === otherId) || (f.addressee_id === userId && f.requester_id === otherId),
  );
  if (!match) return { kind: 'none' };
  if (match.status === 'accepted') return { kind: 'friends', friendship: match };
  if (match.status === 'rejected') return { kind: 'none' };
  return match.requester_id === userId ? { kind: 'outgoing', friendship: match } : { kind: 'incoming', friendship: match };
}

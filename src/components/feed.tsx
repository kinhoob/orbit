import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable, CardEntrance } from './motion';
import { StatePulse } from './feedback';
import { Icon } from './icons';
import { tokens, font} from '../design/tokens';
import { relativeTime, type FeedReview } from '../features/feed/timelines';

const CATEGORY_ICON = { film: 'film', series: 'tv', anime: 'tv', music: 'music', album: 'music', book: 'book', game: 'game', other: 'image' } as const;

/** Cartao de avaliacao nas timelines do Explorar (estilo X: autor, obra, nota, texto, curtidas). */
export function ReviewCard({ review, onToggleLike }: { review: FeedReview; onToggleLike: (review: FeedReview) => void }) {
  const initials = (review.author.display_name || review.author.username || '?').trim().slice(0, 2).toUpperCase();
  return (
    <View style={{ backgroundColor: tokens.colors.surface, borderRadius: 20, padding: 16, gap: 10, boxShadow: '0 4px 16px rgba(23,20,15,0.06)', elevation: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tokens.colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.bold, color: tokens.colors.text }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, color: tokens.colors.text }}>{review.author.display_name || review.author.username}</Text>
          {review.author.username ? <Text style={{ color: tokens.colors.muted, fontSize: 12 }}>@{review.author.username} · {relativeTime(review.created_at)}</Text> : null}
        </View>
        <View style={{ backgroundColor: tokens.colors.primary, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}><Text style={{ fontFamily: font.bold, fontSize: 13, color: tokens.colors.onDark }}>{String(review.score).replace('.', ',')}</Text></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={CATEGORY_ICON[review.media.category as keyof typeof CATEGORY_ICON] || 'image'} size={14} color={tokens.colors.muted} />
        <Text style={{ color: tokens.colors.muted, fontSize: 13 }}>{review.media.title}{review.media.release_year ? ` · ${review.media.release_year}` : ''}</Text>
      </View>
      {review.review ? <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 20 }}>{review.review}</Text> : null}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={review.liked_by_me ? 'Remover curtida' : 'Curtir avaliação'}
        onPress={() => onToggleLike(review)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}
      >
        <StatePulse active={review.liked_by_me}><Icon name="heart" size={18} color={review.liked_by_me ? tokens.colors.accentStrong : tokens.colors.muted} /></StatePulse>
        <Text style={{ color: review.liked_by_me ? tokens.colors.accentStrong : tokens.colors.muted, fontSize: 13 }}>{review.like_count}</Text>
      </MotionPressable>
    </View>
  );
}

/** Lista da timeline com entrada animada. */
export function TimelineList({ reviews, onToggleLike }: { reviews: FeedReview[]; onToggleLike: (review: FeedReview) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {reviews.map((review, index) => (
        <CardEntrance key={review.rating_id} index={index}>
          <ReviewCard review={review} onToggleLike={onToggleLike} />
        </CardEntrance>
      ))}
    </View>
  );
}

/** Balao flutuante "Novas publicacoes" (referencia: X). So aparece quando ha
 * avaliacoes novas de verdade; tocar carrega as novidades e volta ao topo. */
export function NewPostsBubble({ visible, onPress, top = 10 }: { visible: boolean; onPress: () => void; top?: number }) {
  if (!visible) return null;
  // Flutuante como no X: renderizado fora da rolagem, fica fixo no topo do
  // feed mesmo com a lista rolada (pedido do Marco em 19/11/2026).
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center', zIndex: 3 }}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Ver novas publicações"
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, boxShadow: '0 2px 8px rgba(23,20,15,0.25)', elevation: 3 }}
      >
        <Icon name="arrow-up" size={14} color={tokens.colors.onDark} />
        <Text style={{ color: tokens.colors.onDark, fontFamily: font.semibold, fontSize: 13 }}>Novas publicações</Text>
      </MotionPressable>
    </View>
  );
}

/** Alternador das duas timelines (Descobrir | Amigos), referencia: abas do X. */
export function TimelineTabs({ value, onChange }: { value: 'descobrir' | 'amigos'; onChange: (v: 'descobrir' | 'amigos') => void }) {
  const tabs = [
    { id: 'descobrir' as const, label: 'Descobrir' },
    { id: 'amigos' as const, label: 'Amigos' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: tokens.colors.secondary, borderRadius: 999, padding: 4 }}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <MotionPressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Timeline ${tab.label}`}
            onPress={() => onChange(tab.id)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, backgroundColor: active ? tokens.colors.primary : 'transparent' }}
          >
            <Text style={{ fontFamily: active ? font.bold : font.medium, color: active ? tokens.colors.onDark : tokens.colors.muted }}>{tab.label}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

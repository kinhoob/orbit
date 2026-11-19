import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable, CardEntrance } from './motion';
import { StatePulse } from './feedback';
import { Icon } from './icons';
import { tokens } from '../design/tokens';
import { relativeTime, type FeedReview } from '../features/feed/timelines';

const CATEGORY_ICON = { film: 'film', series: 'tv', anime: 'tv', music: 'music', album: 'music', book: 'book', game: 'game', other: 'image' } as const;

/** Cartao de avaliacao nas timelines do Explorar (estilo X: autor, obra, nota, texto, curtidas). */
export function ReviewCard({ review, onToggleLike }: { review: FeedReview; onToggleLike: (review: FeedReview) => void }) {
  const initials = (review.author.display_name || review.author.username || '?').trim().slice(0, 2).toUpperCase();
  return (
    <View style={{ backgroundColor: tokens.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: tokens.colors.border, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '700', color: tokens.colors.text }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: tokens.colors.text }}>{review.author.display_name || review.author.username}</Text>
          {review.author.username ? <Text style={{ color: tokens.colors.muted, fontSize: 12 }}>@{review.author.username} · {relativeTime(review.created_at)}</Text> : null}
        </View>
        <Text style={{ fontWeight: '700', color: tokens.colors.accentStrong }}>{String(review.score).replace('.', ',')}/10</Text>
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
export function NewPostsBubble({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 3 }}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Ver novas publicações"
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.colors.accentStrong, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', elevation: 3 }}
      >
        <Icon name="arrow-up" size={14} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Novas publicações</Text>
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
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: tokens.colors.border }}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <MotionPressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Timeline ${tab.label}`}
            onPress={() => onChange(tab.id)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: active ? tokens.colors.accentStrong : 'transparent' }}
          >
            <Text style={{ fontWeight: active ? '700' : '500', color: active ? tokens.colors.accentStrong : tokens.colors.muted }}>{tab.label}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}


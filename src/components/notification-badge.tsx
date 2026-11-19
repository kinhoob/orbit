import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/provider';
import { countUnreadNotifications } from '../features/social/notifications';
import { unreadBadgeLabel } from '../domain/notifications.mjs';
import { tokens, font} from '../design/tokens';
import { useAccountSettings } from '../features/account/settings';

/**
 * Contador do sino: so aparece com notificacoes reais nao lidas no banco.
 * Enquanto a migration de notificacoes nao for aplicada, a contagem responde
 * zero e nada aparece — nunca badge cosmetico.
 */
export function NotificationBadge() {
  const { session } = useAuth();
  const preferences = useAccountSettings();
  const { data } = useQuery({
    queryKey: ['notifications-unread', session?.user.id],
    queryFn: () => countUnreadNotifications(session!.user.id),
    enabled: !!session && !!supabase && preferences.data?.show_notification_badge !== false,
    refetchInterval: 60 * 1000,
  });
  const label = unreadBadgeLabel(data || 0);
  if (!label || preferences.data?.show_notification_badge === false) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: tokens.colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
    >
      <Text style={{ fontSize: 10, fontFamily: font.bold, color: tokens.colors.dark }}>{label}</Text>
    </View>
  );
}


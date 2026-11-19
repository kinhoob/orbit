export const accountMenuItems = [
  { label: 'Meu perfil', icon: 'user', href: '/(tabs)/profile' },
  { label: 'Minha biblioteca', icon: 'bookmark', href: '/library' },
  { label: 'Minhas coleções', icon: 'book', href: '/collections' },
  { label: 'Amigos', icon: 'heart', href: '/friends' },
  { label: 'Histórico de descobertas', icon: 'compass', href: '/history' },
  { label: 'Conquistas e nível', icon: 'plus', href: '/achievements' },
  { label: 'Personalizar perfil', icon: 'image', href: '/customize' },
  { label: 'Configurações', icon: 'edit', href: '/settings' },
] as const;

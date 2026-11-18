# Arquitetura e plano

## Auditoria inicial

Pasta vazia, sem código, dependências, arquivos de configuração ou credenciais. Node 24 disponível; npm, Supabase CLI e servidor PostgreSQL não foram identificados. Nada existente foi substituído.

## Decisões

Expo Router para Android, iOS e web; TypeScript estrito; TanStack Query para dados remotos. Zustand não é necessário nesta fase. Supabase cuida de identidade e PostgreSQL. Tokens permitem trocar neutral, sky e softYellow sem fixar uma identidade final. Sem APIs de catálogo ou chaves externas nesta etapa.

A migration cria profiles, blocks, friendships, media_items, ratings, saved_items, collections e collection_items. Todas têm RLS. Catálogo é somente leitura no cliente e será alimentado por backend. Perfil é criado por trigger sem reutilizar metadados arbitrários como permissões. Amizade não permite duplicação do par em sentidos opostos; somente destinatário responde solicitações pendentes. Escrita de colunas de identidade é restrita. Salvos são privados; coleções nascem privadas. Avaliações públicas podem ser lidas anonimamente. Bloqueio restringe usuários autenticados, mas conteúdo público permanece acessível a visitantes anônimos.

## Etapas verificáveis

1. Fundação: validar dependências e runtime, aplicar schema, testar auth, permissões e callback em dispositivos reais.
2. Social: edição de perfil, amizades, posts, likes, comments, notifications e reports. Adicionar paginação, índices de feed, bloqueios e moderação antes de disponibilizar interações.
3. Biblioteca: adaptadores de catálogo no servidor, deduplicação por fonte/ID, busca, salvos e coleções. Verificar licenças e atribuições de provedores.
4. Daily: daily_recommendations com unicidade (user_id, recommendation_date), estados available/in_progress/completed, histórico permanente e recomendador por pontuação. Configurar diversidade 70/30, janela antirrepetição e timezone do usuário. Nenhum segredo no app.
5. Gamificação: xp_transactions append-only, níveis, conquistas, desafios, store_items, user_inventory e user_equipment. Todas as recompensas/compras em funções transacionais do backend com chaves idempotentes, bloqueio de saldo e constraints de unicidade. Separar XP vitalício (nível) de saldo gastável (loja). Cliente nunca atualiza XP ou inventário.
6. Qualidade: acessibilidade, performance, segurança, privacidade, testes e preparação de publicação.

Compatibilidade usa diferença absoluta, mínimo configurável de cinco obras e avaliações autorizadas. A função pura inicial tem testes, mas ainda não está exposta por API: a futura RPC deve verificar amizade aceita e bloqueio antes de retornar qualquer resultado. Não representa uma medida científica de personalidade.

## Validação obrigatória em Supabase de desenvolvimento

Criar usuários A, B e C, confirmar e-mails, entrar e reiniciar o app para verificar sessão. Testar recuperação com link válido e expirado. Verificar que A não edita B; A não lê salvos de B; C não lê coleção privada nem avaliação friends de A; visitante lê somente conteúdo público; A não aceita a própria solicitação enviada a B; B pode aceitar; duplicação inversa falha; bloquear impede interações e visibilidade autenticada. Testar notas fora de 0–10 e duplicatas. Não declarar RLS aprovado sem executar esse cenário com JWTs dos usuários e anon (service_role ignora RLS).

Credenciais necessárias: URL e publishable key do Supabase para o app; acesso de administração/CLI para aplicar migrations. Integrações de catálogo e tarefas agendadas só serão configuradas em suas fases.

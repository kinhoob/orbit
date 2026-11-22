# Perfil em abas e favoritos

Pedido do Marco em 22/11/2026: personalizar o perfil com uma aba de favoritos.

## O que mudou no app

- O perfil passa a ter abas: **Linha do tempo**, **Favoritos**, **Coleções** e **Salvos**. Salvos são privados e só aparecem no próprio perfil; no perfil de outra pessoa as abas são Linha do tempo, Favoritos e Coleções (`profileTabsFor` em `src/domain/favorites.mjs`).
- A página de cada obra ganha o botão de coração: "Marcar como favorita" destaca a obra na aba Favoritos do perfil. O toque responde na hora, desfaz em caso de erro e atualiza o servidor em seguida (mesmo padrão dos salvos, em `src/features/catalog/favorites.ts`).
- A aba Favoritos mostra as obras em carrossel horizontal (pedido do Marco, 22/11/2026), da marcação mais recente para a mais antiga; a ponta do próximo card indica o arraste.

## Banco: migration em revisão, não aplicada

`supabase/migrations/20261122233000_profile_favorites.sql` cria `public.profile_favorites` (uma linha por pessoa e obra) com RLS:

- leitura pública (inclusive anônima), escondida quando há bloqueio entre as pessoas — mesma visibilidade das avaliações públicas, pois os favoritos são a vitrine do perfil;
- marcar e desmarcar só pelo próprio `auth.uid()`;
- depende do schema `orbit_private` da migration `20261122202000_private_social_helpers.sql`, portanto precisa ser aplicada depois dela.

A migration **não foi aplicada** ao projeto remoto neste PR. Enquanto isso, o app age com honestidade: a aba Favoritos explica que o recurso chega com a atualização do banco, e o botão de coração não aparece nas obras (a primeira resposta de "tabela inexistente" desliga o recurso na sessão, sem dado inventado — mesmo padrão do Sino de notificações).

Se a visibilidade pública dos favoritos não for a desejada, a policy `profile_favorites_read` é o único ponto a ajustar antes de aplicar.

## Validação

- `tests/favorites.test.mjs`: abas por perfil, detecção de tabela ausente, feedback imediato, desfazer em erro, proteção contra toques repetidos e ordem da lista.
- `supabase/tests/profile_favorites.sql` (roda no `npm run test:sql` local, PostgreSQL embutido): escrita negada para terceiros, duplicata rejeitada, leitura pública e anônima, bloqueio escondendo favoritos e remoção pelo dono.
- TypeScript, testes de domínio e exportação web passam. Nenhum teste contra o banco real ou em aparelho físico foi feito.

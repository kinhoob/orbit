# Números do perfil (avaliações, amigos, curtidas)

Pedido do Marco em 22/11/2026: o perfil deve mostrar as curtidas que a pessoa já recebeu, os amigos e demais números "como qualquer perfil do TikTok ou Instagram" — visíveis direto no perfil, sem clicar.

## O que aparece

Logo abaixo da identidade (avatar, nome, @username e bio), uma linha com três números:

- **Avaliações** — quantas avaliações a pessoa tem, contando só as que o visitante pode ler.
- **Amigos** — total de amizades aceitas. Sem seguidores: o ORBIT mantém amizade bidirecional e só o total é exibido, nunca a lista. No próprio perfil, o número leva à tela de amizades.
- **Curtidas** — curtidas recebidas nas avaliações visíveis para quem vê.

Os números usam contagem compacta em português: exatos até 999, depois "1,2 mil" e "3,4 mi" (`src/domain/profile-stats.mjs`).

A linha fica acima dos favoritos fixados e das opções (Linha do tempo, Coleções, Salvos), tanto no próprio perfil (`app/(tabs)/profile.tsx`) quanto no perfil de outras pessoas (`app/people/[id].tsx`).

## Fonte dos dados

Os três números vêm da RPC `profile_stats(profile_id)` da migration `supabase/migrations/20261123001500_profile_stats.sql` (**em revisão, não aplicada**). A função é `security definer` e replica exatamente as regras de leitura já existentes:

- bloqueio em qualquer direção entre visitante e dono do perfil retorna nulo — o perfil inteiro já fica escondido nesse caso;
- avaliações contam conforme a visibilidade (pública para todos; de amigos só para amigos aceitos; privadas só para a própria pessoa), espelhando a política `ratings_read`;
- curtidas contam só sobre avaliações visíveis para o visitante e excluem curtidas de pessoas com bloqueio entre elas e o visitante, espelhando a política `rating_likes_read`;
- amigos são só o total de amizades aceitas — a lista continuará restrita aos participantes pela RLS de `friendships`.

Depende de `orbit_private` (20261122202000, já aplicada) e de `rating_likes` (202611180002, em revisão): enquanto `rating_likes` não for aplicada, a migration dos números não deve ser aplicada.

## Estado honesto

Enquanto a RPC não existe no banco, o cliente detecta a resposta de função ausente (`PGRST202`/`42883`) e mostra no perfil o aviso "Os números do perfil chegam com a próxima atualização do banco, que já está em revisão." — nunca número inventado (`src/features/social/profile-stats.ts`). Falhas de rede não derrubam o perfil: a linha simplesmente não aparece.

## Testes

- `tests/profile-stats.test.mjs`: formatação compacta, detecção de RPC ausente, passagem dos números reais, nulo para bloqueados e erro propagado sem flag de indisponível.
- `supabase/tests/profile_stats.sql` (roda com `npm run test:sql` no PostgreSQL local): dona, amiga, estranha, curtidora bloqueada, visitante anônimo e perfil bloqueado, conferindo os três números em cada papel.

## Limites

- Sem contador de seguidores ou de "seguindo": o modelo é de amizade, preservado.
- O número de curtidas não é o total histórico absoluto: é o total sobre o que o visitante pode ver, igual ao que ele já encontraria somando as timelines.
- Não testado em aparelho físico nem com conta real; validado em testes de regras, TypeScript, suítes SQL locais e exportação web.

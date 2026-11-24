# Foto de perfil, capa temática e cabeçalho organizado

Pedido do Marco em 23/11/2026 ("ok, faça" para o conjunto proposto no WhatsApp).

## O que mudou

- **Foto de perfil de verdade**: o avatar deixa de ser só a inicial. No próprio perfil, um selo de câmera sobre o avatar abre a galeria (expo-image-picker, corte quadrado); a foto sobe para o bucket público `avatars` do Storage, na pasta do próprio usuário, e a URL pública (com `?v=` para quebrar cache) é gravada em `profiles.avatar_url`. Gaveta, prévia do Personalizar e perfil visitado já renderizam `avatar_url` — nenhuma tela nova depende de dado inventado.
- **Capa temática**: faixa no topo do cabeçalho (próprio e visitado) tingida pelas cores do tema escolhido no Personalizar, com o motivo da marca (círculo claro, ponto dourado). Só cores do tema — sem imagem de obra, por licença.
- **Bio dentro do cabeçalho** e **ações com ícone**: Editar, Personalizar e Conquistas viram botões com ícone no cartão; os links de texto soltos saíram. O perfil visitado ganha a mesma capa e a bio dentro do cartão.

## Banco (migration em revisão, NÃO aplicada)

`supabase/migrations/20261123060000_profile_avatars.sql` cria o bucket `avatars` (público para leitura, como o restante do cabeçalho) e as políticas em `storage.objects`: leitura pública; insert/update/delete só para `authenticated` dentro da pasta do próprio `auth.uid()`. Não muda tabelas nem dados existentes.

Enquanto a migration não é aplicada, o envio da foto responde com o estado honesto "A foto de perfil chega com a próxima atualização do banco, que já está em revisão." — mesmo contrato das conquistas e da personalização por nível. O teste de políticas está em `supabase/tests/profile_avatars.sql` (PGlite, com espelho mínimo do schema `storage` em `scripts/verify-sql-local.mjs`).

## Validação

- `npm run typecheck` limpo; `npm test` com 207 testes (8 novos de domínio do avatar); `npm run test:sql` com a suíte nova de políticas do bucket.
- `scripts/verify-profile-ui.mjs` (isolado, sem conta nem banco real): cabeçalho próprio e visitado com capa, foto, bio, ações com ícone e selo de câmera; compatibilidade preservada.

## Limites conhecidos

- O upload real NÃO foi validado de ponta a ponta: depende da migration aplicada e de um dispositivo com galeria. O que foi verificado é o contrato (caminho, tipos, limite de 5 MB, erros) e a interface com dados isolados.

## Rodada 2: foto em todo o app e remover foto (24/11/2026)

Pedido do Marco em 24/11/2026 ("sim faça tudo", resposta à proposta de levar a foto para amigos, chat e listas e permitir remover).

- Componente único `src/components/avatar.tsx`: mostra `avatar_url` e volta para a inicial quando não há foto ou a imagem falha ao carregar.
- Agora com foto: gaveta (avatar do topo), Amizades (linhas e sugestões), Busca de pessoas, lista de conversas, cabeçalho do chat, prévia do perfil no chat, Sino (autor da notificação) e cartões das timelines do Explorar. As consultas já traziam `avatar_url`; nada novo no banco.
- Remover foto: botão de fechar no avatar do próprio perfil. `removeAvatar` limpa `profiles.avatar_url` primeiro (a inicial volta em todas as telas) e depois apaga `avatar.jpg|png|webp|gif` da pasta do próprio usuário no bucket `avatars`. A política de DELETE já existe (só o dono). Se o Storage falhar, a tela avisa que a foto saiu do perfil mas o arquivo ainda não foi apagado.
- Sem migration nova. Testes: 208 (inicial de fallback e caminhos de remoção). Não validado em aparelho nem com duas contas.

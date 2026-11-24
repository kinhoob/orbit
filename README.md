# ORBIT

Preparação revisável de callbacks/Auth e privacidade: [docs/access-preparation.md](docs/access-preparation.md). Não aplicada ao Supabase.

Para trabalhar com outra IA ou em um ambiente na nuvem, comece por [docs/cloud-development.md](docs/cloud-development.md) e [AGENTS.md](AGENTS.md). O estado atual da validação de login e do banco está em [docs/login-validation.md](docs/login-validation.md); algumas seções abaixo descrevem etapas anteriores do projeto.

Aplicativo social de descobertas culturais em React Native, Expo Router, TypeScript e Supabase. Seguir é unilateral e sem aceite; quando a pessoa segue de volta, os dois viram amigos e amigos podem trocar mensagens. Deixar de seguir desfaz a amizade e a permissão de novas mensagens.

## Abrir o projeto

Execute `INICIAR.cmd` nesta pasta. Alternativamente, no PowerShell:

```powershell
.\iniciar-orbit.ps1
```

O inicializador baixa a versão estável do Expo, lê sua matriz oficial de pacotes, alinha as dependências, instala, executa Expo Doctor, TypeScript e testes, e inicia a versão web. Precisa de internet e Node com npm. Os arquivos existentes do aplicativo são preservados. Se a política local impedir scripts PowerShell, use um terminal autorizado para scripts locais.

Para somente instalar e verificar: `.\iniciar-orbit.ps1 -SomenteVerificar`. Depois de instalado: `npm run web`, `npm run android` ou `npm start`. Para testar regras sem baixar dependências: `node --test tests/*.test.mjs`.

## Implementação atual

- Navegação: barra de baixo com Início, Explorar, Criar, Busca e Sino; Perfil, Salvos e Amizades na gaveta que abre pelo arraste da borda esquerda ou pelo avatar no topo (no desktop, coluna lateral com Perfil).
- Mural da Início com curadoria local de obras reais (metadados reais; todas as capas ilustradas localmente, sem imagem protegida); ver docs/visual-review.md.
- Descobrir sem Supabase: busca pública ao vivo de séries/animes (TVmaze, CC BY-SA) e livros (Open Library), com atribuição na tela.
- Cadastro, login, confirmação por link, recuperação de senha e persistência de sessão.
- Animação curta de entrada na abertura do app; as informações aparecem depois dela. Com reduzir movimento, o conteúdo aparece direto.
- Busca no catálogo com filtro por categoria e estados de carregamento, erro e vazio.
- Detalhes da obra, avaliação de 0 a 10, opinião e visibilidade pública, amigos ou privada.
- Adicionar/remover salvos e consultar os 100 itens recentes da biblioteca privada.
- Edição de nome, username e biografia; logout com limpeza do cache.
- Foto de perfil enviada da galeria para o Storage (bucket `avatars`, escrita só na pasta do dono), capa do cabeçalho tingida pelo tema escolhido no Personalizar, bio dentro do cabeçalho e ações com ícone (Editar, Personalizar, Conquistas) no próprio perfil; o perfil visitado ganha a mesma capa e a bio no cartão. Detalhes em [docs/profile-photos.md](docs/profile-photos.md). A migration `20261123060000_profile_avatars.sql` está em revisão (não aplicada); até lá o envio da foto explica o estado em vez de fingir sucesso.
- Perfil com números sociais (avaliações, seguidores, seguindo, amigos e curtidas recebidas, estilo TikTok/Instagram), Favoritos em carrossel fixado no topo, visível sem clicar, e abaixo as opções Linha do tempo, Coleções e Salvos (salvos só no próprio perfil). A página da obra tem botão de coração para destacá-la nos favoritos. Detalhes em [docs/profile-favorites.md](docs/profile-favorites.md) e [docs/profile-stats.md](docs/profile-stats.md).
- No perfil de outras pessoas: botão Seguir/Seguindo (sem aceite; seguir de volta vira amizade), curtida nas avaliações da linha do tempo, e menu de opções (três tracinhos) com denúncia registrada (sem moderação ainda) e bloqueio. Amigos trocam mensagens: botão Enviar mensagem no perfil e lista de conversas a partir de Amizades, sem moderação de conteúdo. Detalhes em [docs/profile-interactions.md](docs/profile-interactions.md).
- Tokens neutros com alternativas em azul-claro e amarelo suave.
- Migration com perfis, bloqueios, amizades, catálogo, avaliações, salvos e coleções, incluindo RLS.
- Migrations em revisão (não aplicadas): curtidas em avaliações, criador nas obras, notificações do Sino (pedido de amizade, amizade aceita e curtida, criadas por gatilhos; o app mostra estado honesto enquanto a tabela não existe, sem contador inventado), seguir com amizade por reciprocidade e contagem de seguidores (`20261123010000_follows.sql`), denúncias (`20261123011000_reports.sql`) e mensagens entre amigos (`20261123012000_messages.sql`). Enquanto seguir, denúncia e mensagens não chegam ao banco, o app explica o estado em vez de fingir sucesso. Favoritos do perfil: `20261122233000_profile_favorites.sql` já aplicada em 22/11/2026 (visibilidade pública confirmada pelo Marco). Números do perfil: `20261123001500_profile_stats.sql` já aplicada em 22/11/2026; curtidas em avaliações já existiam no banco (criação manual anterior), então só a função nova foi aplicada.
- Sete testes de regras: compatibilidade, notas e credenciais.

As telas consultam o Supabase; não há pessoas, avaliações ou catálogo fictícios. Sem conexão, mostram estados informativos. Mural social, amizades pela interface, coleções pela interface, Daily, XP, loja, conquistas e moderação **ainda não estão implementados**. A estrutura do banco não representa uma interface concluída.

## Supabase

### Menu pessoal e perfil

O menu inclui Perfil, Biblioteca, Coleções, Amigos, Histórico, Conquistas, Personalização, Configurações e Ajuda. O perfil agora lista avaliações por data, com paginação. Biblioteca e Coleções usam as tabelas existentes. Histórico, XP, preferências e cosméticos exigem a migration `202611190002_account_universe.sql`, aplicada depois das anteriores. Consulte `docs/account-universe.md` para limites e testes SQL. Nenhum banco remoto foi modificado nesta entrega.

### Fluidez e navegação

As abas móveis têm rótulos e indicador animado. Criar abre diretamente a escolha da obra; Busca separa Obras e Pessoas, com perfis individuais. Skeletons preservam espaço durante o carregamento; curtidas e salvos têm feedback animado, com respeito a reduzir movimento. As preferências opcionais do primeiro acesso organizam apenas a curadoria local e ficam no dispositivo. Ver `docs/ux-polish.md` para testes manuais e limites.

### Correções de descoberta

Os filtros públicos agora separam séries e animes. Os cards da curadoria abrem detalhes locais e encaminham para a obra real quando há uma correspondência no catálogo. Curtidas usam o cache da conta e voltam a consultar o servidor após a alteração.

O ranking global do Explorar depende da migration `supabase/migrations/202611190001_discover_ranking.sql`, aplicada depois das migrations anteriores. Validação e limites estão em `docs/discovery-fixes.md`. Não foi aplicado nenhum SQL a um projeto remoto nesta alteração.

Copie `.env.example` para `.env` se ainda não existir. O inicializador também faz essa cópia sem sobrescrever arquivos existentes. Preencha:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:8081/auth/callback
```

No Supabase aplique `supabase/migrations/202611150001_foundation.sql` pelo SQL Editor. Alternativa com CLI: `supabase init`, `supabase link --project-ref SEU_PROJECT_REF` e `supabase db push`.

Ative confirmação de e-mail e senha mínima de 8 caracteres. Em Auth > URL Configuration, inclua o callback web e `orbit://auth/callback`. Em builds mobile use `EXPO_PUBLIC_AUTH_REDIRECT_URL=orbit://auth/callback`. Reinicie o Expo após mudar `.env`. Nenhuma chave service_role ou segredo de provedor pode entrar no app.

O catálogo começa vazio. A importação por provedores externos pertence à próxima etapa; somente o backend pode escrever em `media_items`. Não há projeto remoto configurado automaticamente.

## Validação e limitações

Última verificação local: **7 testes de domínio passaram**. A máquina tem Node e npm. O ambiente do agente não conseguiu resolver `registry.npmjs.org` (`ENOTFOUND`), portanto não foi possível instalar dependências, gerar lockfile, executar TypeScript, abrir Expo ou verificar visualmente as telas. As versões iniciais em `package.json` ainda precisam ser alinhadas pelo inicializador. Testes de domínio não aprovam o build ou as políticas do banco.

Autenticação, migrations e RLS precisam de validação com um projeto Supabase de desenvolvimento. O roteiro está em `docs/architecture.md`. Não publicar antes dessa verificação.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| app/(tabs)/ | Áreas principais da barra de baixo |
| app/auth/ | Formulários e callback |
| app/media/ | Detalhes e avaliação de obras |
| src/components/ | Componentes reutilizáveis |
| src/design/ | Tokens de interface |
| src/features/ | Autenticação e catálogo |
| src/domain/ | Regras puras |
| supabase/migrations/ | Schema e políticas versionadas |
| tests/ | Testes com Node |

Próxima entrega: validar a base instalada e o Supabase, depois implementar mural, amizades e notificações. Daily, compatibilidade protegida e XP seguro seguem o plano em `docs/architecture.md`.

# Revisão visual e catálogo real do ORBIT

A branch `visual-catalog` parte de `motion-polish` (que parte de `review-all-four`, commit `ebc1d569ee20237fcb25ef6ba3dbce8e1135c210`). O PR desta rodada usa `motion-polish` como base para mostrar somente o que mudou agora; depende dos PRs anteriores, que continuam separados e sem merge. Não comparar esta rodada diretamente com `main` como se fosse independente.

## Experimentar

Em uma pasta nova:

```sh
git clone --branch visual-catalog --single-branch https://github.com/kinhoob/orbit.git orbit-visual
cd orbit-visual
npm ci
npm run typecheck
npm test
npm run web
```

Sem Supabase, Início mostra o mural de curadoria local identificado como tal; Descobrir e as demais telas mantêm os estados reais de conexão/login ausentes.

## O que mudou

- Mural da Início passa a usar uma curadoria local de 22 obras reais (filmes, séries, animes, jogos, álbuns e livros), com título, criador e ano reais. Não é o catálogo conectado e o selo na tela diz isso.
- Nenhuma arte oficial é distribuída: todas as 22 capas são ilustradas e geradas localmente (tom por categoria + ícone), sem imagem protegida. Ver "Fontes e direitos" abaixo.
- Ícones de linha consistentes na navegação e nos estados (SVG via `react-native-svg`, idênticos na web e no nativo). Estado ativo usa a nova cor de assinatura azul-petróleo (`tokens.colors.accentStrong`), também aplicada a filtros e links.
- Abertura da Início mais compacta no celular (título menor, texto mais curto, filtros mais apertados) para as obras aparecerem mais cedo.
- Perfil com cabeçalho (iniciais, nome, @username, e-mail) e biografia em destaque; edição vira ação secundária; estado deslogado e Salvos vazios ganham ícone e texto próprios. Nenhum número, atividade ou pessoa inventada.
- Nova dependência: `react-native-svg` na versão alinhada ao Expo instalado, usada só para os ícones. `package.json` e `package-lock.json` mudaram apenas por ela.

## Fontes e direitos (verificado em 18/11/2026)

- Metadados das obras (título, criador, ano) são fatos e foram conferidos em fontes públicas (MusicBrainz para álbuns; demais obras em fontes editoriais públicas).
- Cover Art Archive/MusicBrainz: serviço público de capas, mas a política oficial diz que as imagens são coletadas para arquivamento e devem ser usadas "por sua conta e risco" (https://musicbrainz.org/doc/Cover_Art_Archive). Disponibilidade e atribuição NÃO equivalem a licença da arte dos álbuns; por isso esta rodada NÃO usa essas imagens.
- Pôsteres de filmes/séries e capas de jogos/livros modernos NÃO têm licença livre para reúso: hotlink da Wikipédia é tecnicamente permitido, mas o fair use da Wikipédia não cobre um app externo; TVmaze, Steam e Open Library tampouco garantem licença de imagem para este uso.
- TMDB (avaliado e não adotado nesta rodada): os termos oficiais exigem conta e chave de API, atribuição com logo, proíbem uso comercial sem contrato separado e proíbem uso em aplicações de IA (https://www.themoviedb.org/api-terms-of-use). Uma conta gratuita não resolve essas restrições; TMDB não é apresentado como caminho único. Arte oficial só entra quando o Marco escolher um provedor cujos termos caibam no app (decisão dele, sem compromisso assumido nesta rodada).

## Conferir manualmente

1. Em 390 px, abra Início: os cards entram com a abertura compacta. Todas as capas (incluindo álbuns) são ilustradas por categoria, sem imagem protegida.
2. Navegue pelas abas e confira os ícones de linha e o estado ativo em azul-petróleo.
3. Em Perfil sem login, confira o estado de convite. Com login, confira o cabeçalho com iniciais e a edição como ação secundária. (Sem Supabase configurado, o estado de convite é o caminho visível.)
4. Em 1440 px, confira a navegação lateral e a grade de quatro colunas.

## Validação desta rodada

- `npm ci` limpa, TypeScript sem erros, 20 testes Node passando (3 novos testes de integridade da curadoria).
- Export web concluído; suíte de movimento no bundle real passando (transições por frame, toque, filtros, redução de movimento ao vivo, teclado, 390/1440 px sem overflow).
- Conferido no bundle real que nenhuma imagem externa é carregada no mural; capas ilustradas confirmadas em todas as categorias. Vídeo do bundle real inspecionado.
- `react-native-svg@15.16.0` adicionada via alinhamento do Expo. Auditoria da instalação: reavaliar `npm audit` antes de produção; esta rodada não alterou outras dependências.
- Não houve validação em aparelho físico, backend/RLS real, merge ou deploy. `.env`, banco e migrations não foram alterados.

## Bloco de encerramento

Antes de editar, README.md, docs/architecture.md e o código existente foram relidos. O trabalho está em branch própria, sem merge nem publicação automática, sem `.env` ou credenciais.

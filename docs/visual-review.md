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

## Busca pública ao vivo (Descobrir sem Supabase)

Quando o Supabase não está configurado, a tela Descobrir passa a oferecer busca pública AO VIVO com metadados reais, com um rótulo curto de fontes/cobertura ("Busca pública ao vivo: séries, animes e livros · Fontes · Capas ilustradas") em vez de texto técnico. Capas continuam ilustradas localmente — nenhum provedor de imagem é usado.

- TVmaze (séries e animes): API REST pública, gratuita, sem chave, com CORS liberado e dados sob CC BY-SA, conforme a página oficial da API (https://www.tvmaze.com/api#licensing). A atribuição exigida aparece na tela ("Fonte: TVmaze") e cada item carrega a URL do TVmaze; uso respeita ShareAlike.
- Open Library/Internet Archive (livros): API pública para descoberta e consulta humana de livros, sem chave (https://openlibrary.org/developers/api). As diretrizes pedem registro do aplicativo, cache e vedam uso como backend em massa ou infraestrutura comercial de alto tráfego; a busca sob demanda do usuário com cache de 10 min se enquadra. O registro do app (gratuito) fica como passo recomendado para o Marco.
- NÃO integrados nesta rodada: álbuns via MusicBrainz (a API é gratuita apenas para uso NÃO comercial — https://musicbrainz.org/doc/MusicBrainz_API — e o ORBIT pode ter uso comercial; exigiria plano comercial), filmes e jogos (TMDB com restrições já citadas; IGDB exige chave/conta; API da Steam é não oficial). Entram quando o Marco decidir o provedor.
- Implementação: src/features/catalog/public-search.ts (normalização + atribuição por item, sem chave e sem segredo), com testes de unidade sem rede em tests/public-search.test.mjs.

## Caminhos para filmes e álbuns (produto comercial; verificado em 18/11/2026)

- Contexto: o Marco confirmou em 18/11/2026 que o ORBIT é um produto comercial. Isso elimina provedores restritos a uso pessoal/não comercial.
- Filmes: TMDB é o único caminho completo verificado (metadados + pôsteres). Os termos (https://www.themoviedb.org/api-terms-of-use) exigem conta/chave e atribuição com logo, vedam uso comercial SEM acordo escrito com o TMDB (seção 2, possíveis taxas) e vedam uso em aplicações de IA. Próximo passo concreto: o Marco obtém o acordo comercial com o TMDB e cria a chave (decisão e aceite dele, nada assumido aqui). O adaptador já está implementado atrás de EXPO_PUBLIC_TMDB_API_KEY combinada com a flag explícita EXPO_PUBLIC_TMDB_COMMERCIAL_AGREED=true (só a chave não ativa nada), cobrindo METADADOS de filmes na busca pública; pôsteres só entram com a atribuição de logo exigida pelos termos, pendente de ativação. Rota de acesso: conta no themoviedb.org, chave em https://www.themoviedb.org/settings/api com aceite dos termos, e acordo comercial separado com o TMDB (seção 2 dos termos; valores não publicados). Metadados de álbuns via MetaBrainz têm planos comerciais publicados a partir de US$ 100/mês (https://metabrainz.org/supporters/account-type). OMDb descartado: licença pessoal/não comercial (https://www.omdbapi.com/legal.htm).
- Álbuns, metadados: MusicBrainz é candidato, mas a API pública é gratuita só para uso NÃO comercial (https://musicbrainz.org/doc/MusicBrainz_API). Para uso comercial há planos pagos da MetaBrainz; alternativa técnica são os dumps de dados CC0. Decisão de custo do Marco.
- Álbuns, arte: nenhuma fonte com elegibilidade comercial verificada nesta rodada. Cover Art Archive não concede licença ("por sua conta e risco"); Spotify for Developers restringe transferência/monetização de conteúdo (https://developer.spotify.com/terms) e não foi verificado como elegível; Discogs tem dados parcialmente CC0, mas imagens só com key/secret e sob os API Terms of Use. Capas de álbuns seguem ilustradas.
- Bloqueio real: a contratação do acordo comercial TMDB (filmes) e a decisão sobre MetaBrainz (metadados de álbuns) são passos do Marco, com possível custo. Com a chave TMDB e a flag de aprovação configuradas (EXPO_PUBLIC_TMDB_API_KEY + EXPO_PUBLIC_TMDB_COMMERCIAL_AGREED=true), filmes entram na busca ao vivo pelo adaptador já implementado em src/features/catalog/public-search.ts.

## Menu e salvos (pedido do Marco em 18/11/2026)

- Menu só com ícones, seguindo a referência do app do Pinterest: Início, Descobrir, Criar e Perfil, com rótulo de acessibilidade em cada item e estado ativo em azul-petróleo com indicador.
- Salvos aparecem apenas dentro do próprio perfil (seção "Seus salvos", privada por RLS com policy de dono). A aba Salvos saiu do menu e a rota antiga redireciona para o perfil.

## Proveniência dos metadados da curadoria

- Álbuns (6): conferidos no MusicBrainz, release IDs em cada item de src/features/home/curated-data.mjs (ex.: Kind of Blue — https://musicbrainz.org/release/e32a3f0b-1c19-3170-bb1c-650893774744; Random Access Memories — /f6758afb-ecff-410e-8979-b131cfa3c6d3; OK Computer — /6a09041b-0f79-3278-88d9-0552dd28d37f; Clube da Esquina — /556ebda7-7ad3-4b21-b672-73722e486a00; Getz/Gilberto — /1cb544a7-f1d6-4159-9661-8645cbaf257c; Construção — /4ad7a356-d1d8-4367-8b33-dbb31c29517f).
- Filmes, séries, animes, jogos e livros (16): título, criador e ano são fatos amplamente publicados, conferidos em fontes editoriais públicas (páginas oficiais de estúdio/editora e Wikipédia) durante a curadoria; séries e animes agora também cobertos pela busca pública TVmaze descrita acima.

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

- `npm ci` limpa, TypeScript sem erros, 24 testes Node passando (3 de integridade da curadoria + 4 da busca pública incluindo TMDB sem rede, todos com fetch simulado).
- Export web concluído; suíte de movimento no bundle real passando (transições por frame, toque, filtros, redução de movimento ao vivo, teclado, 390/1440 px sem overflow).
- Conferido no bundle real que nenhuma imagem externa é carregada no mural; capas ilustradas confirmadas em todas as categorias. Vídeo do bundle real inspecionado.
- `react-native-svg@15.16.0` adicionada via alinhamento do Expo. Auditoria da instalação: reavaliar `npm audit` antes de produção; esta rodada não alterou outras dependências.
- Não houve validação em aparelho físico, backend/RLS real, merge ou deploy. `.env`, banco e migrations não foram alterados.

## Bloco de encerramento

Antes de editar, README.md, docs/architecture.md e o código existente foram relidos. O trabalho está em branch própria, sem merge nem publicação automática, sem `.env` ou credenciais.

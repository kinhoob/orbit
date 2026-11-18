# Revisão das quatro tarefas do ORBIT

Esta branch (`review-all-four`) reúne os arquivos dos quatro PRs para testar tudo junto. Não é um deploy nem um merge em `main`. Os quatro PRs continuam independentes e abertos para revisão:

- #1: mural masonry, `home-masonry-mural`.
- #2: navegação adaptativa, `nav-bottom-sidebar`.
- #3: detalhes e avaliação, `media-details-refinement`.
- #4: amizades, `friendships-ui`.

Os arquivos de implementação desta branch foram comparados byte a byte com os respectivos PRs. Este guia é o único arquivo adicional de documentação.

## Abrir tudo junto

Em uma pasta nova, com Git e Node/npm instalados:

```sh
git clone --branch review-all-four --single-branch https://github.com/kinhoob/orbit.git orbit-review
cd orbit-review
npm ci
npm run typecheck
npm test
npm run web
```

Não é preciso alterar sua cópia de trabalho atual. Sem Supabase configurado, a tela Início permite ver o mural identificado como Demonstração e a navegação. As demais telas mostram a ausência de conexão, sem inventar um catálogo ou amizades reais.

Em telas de pelo menos 768 px, as cinco áreas aparecem na barra lateral. Abaixo disso, aparecem na barra inferior. As rotas de detalhes (`/media/ID`) e amizades (`/friends`) são telas secundárias. Com uma sessão válida, o Perfil tem o link Amizades.

Para dados reais, use somente um Supabase de desenvolvimento e siga o README e `docs/architecture.md`. Nenhum banco foi criado ou modificado nesta entrega. Nenhuma credencial está nos arquivos.

## Roteiro manual

1. Em Início, compare as capas de proporções diferentes e filtre as categorias. Os itens do mural são exemplos locais, não o catálogo real.
2. Redimensione a janela para 390 px e para 1440 px. Troque entre Início, Descobrir, Criar, Salvos e Perfil. Confira o estado ativo.
3. Em Descobrir, abra uma obra real do seu catálogo de desenvolvimento. Confira capa, título, categoria, descrição, ano, salvar e avaliação. Experimente notas 0, 10, 8,5 e uma nota inválida. Escolha Pública, Amigos ou Privada.
4. Em Perfil > Amizades, busque outro usuário de desenvolvimento. Envie uma solicitação; com o destinatário, aceite ou recuse. Cancele uma enviada e remova uma aceita. Uma recusa mantém o par no banco; a busca permite limpar essa solicitação antes de tentar novamente.
5. Com usuários de desenvolvimento A, B e C, execute o roteiro de bloqueios e RLS da arquitetura. Não use service_role para esse teste.

## Testes de interface sem banco real

Os scripts em `scripts/verify-media-ui.mjs` e `scripts/verify-friends-ui.mjs` abrem o bundle real no Chrome e interceptam a rede com dados isolados. Eles não entram em nenhuma conta real e bloqueiam requisições externas fora do domínio fictício interceptado. Isso valida a interface e os pedidos do cliente, não as políticas do servidor.

Requisitos adicionais: Chrome instalado e `puppeteer-core` disponível. O pacote de teste não faz parte das dependências de produção. Em uma cópia descartável de revisão:

```sh
npm install --no-save --package-lock=false puppeteer-core
```

No PowerShell, defina `CHROME_PATH` com o caminho do executável Chrome instalado. Gere um bundle isolado:

```powershell
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_SUPABASE_URL = 'https://orbit-test.supabase.co'
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'isolated-test-fixture'
npx expo export --clear --platform web --output-dir dist-ui-fixture
node scripts/verify-media-ui.mjs dist-ui-fixture
node scripts/verify-friends-ui.mjs dist-ui-fixture
Remove-Item Env:EXPO_NO_DOTENV, Env:EXPO_PUBLIC_SUPABASE_URL, Env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

No Linux/macOS:

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://orbit-test.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=isolated-test-fixture npx expo export --clear --platform web --output-dir dist-ui-fixture
CHROME_PATH=/caminho/do/chrome node scripts/verify-media-ui.mjs dist-ui-fixture
CHROME_PATH=/caminho/do/chrome node scripts/verify-friends-ui.mjs dist-ui-fixture
```

A URL e a chave acima são fictícias e exclusivas dos testes interceptados. Não use esse bundle para uso normal. Ao terminar, volte a gerar o bundle normal, sem essas variáveis. Os scripts geram capturas locais na pasta de execução.

## O que foi validado nesta entrega

- TypeScript sem erros; 15 testes Node passam na combinação.
- Export web da combinação concluído.
- Mural, filtros e navegação conferidos em desktop/mobile.
- Interface de detalhes: nota inválida não envia; notas 0 e 10; visibilidade e `aria-checked`; salvar/remover; carregamento, erro/retry e obra não encontrada.
- Interface de amizades: busca, envio, aceitar, recusar, cancelar e remover; sem overflow horizontal em 390 px.
- Queries de amizades testadas isoladamente para filtros, duplicata, recusa, erro de permissão e alteração sem linha.

## O que não foi aprovado

Não houve escrita em um Supabase real nem execução das políticas RLS com JWTs A/B/C. A verificação de bloqueios e RLS foi por leitura da migration existente e testes isolados do cliente. Não houve teste em aparelho iOS/Android físico. Faça essas verificações antes de publicar o app.

Sem alteração em `.env`, sem merge em `main` e sem deploy.

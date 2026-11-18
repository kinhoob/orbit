# Revisão de movimento do ORBIT

A branch `motion-polish` parte de `review-all-four` (commit `ebc1d569ee20237fcb25ef6ba3dbce8e1135c210`). O PR desta rodada usa `review-all-four` como base para mostrar somente o polimento novo. Portanto, depende do conjunto dos PRs #1, #2, #3 e #4, que continuam separados e sem merge. Não comparar esta rodada diretamente com `main` como se fosse independente.

## Experimentar

Em uma pasta nova:

```sh
git clone --branch motion-polish --single-branch https://github.com/kinhoob/orbit.git orbit-motion
cd orbit-motion
npm ci
npm run typecheck
npm test
npm run web
```

Sem Supabase, Início mostra o mural já identificado como Demonstração. Descobrir e as demais telas mantêm os estados reais de conexão/login ausentes. Nenhum catálogo, conta ou amizade real foi inventado para esta rodada.

## O que mudou

- Entrada do conteúdo ao focar uma tela: deslocamento vertical de 14 px e opacidade de 0,94 a 1, em 220 ms. Funciona nas cinco abas, ao voltar e nas telas secundárias que usam `Screen`. A navegação não espera a animação terminar. A animação padrão do Stack fica desativada para não somar dois efeitos.
- Entrada de cards do mural e catálogo: 8 px, 260 ms, escalonamento de 24 ms nos primeiros oito cards. Os demais ficam parados. Não anima dimensões nem recalcula o layout a cada frame.
- Resposta ao pressionar botões compartilhados, filtros, abas e cards do catálogo: escala até 0,98; retorno ao soltar. O feedback de opacidade continua disponível com movimento reduzido. Cards de demonstração continuam sem ação, pois seus IDs não existem no banco.
- Tokens, espaçamentos editoriais, áreas principais e operações Supabase preservados. Não há dependência nova de produção.
- Preferência de reduzir movimento: começa conservadoramente sem movimento até conhecer a preferência. Usa `prefers-reduced-motion` no web e `AccessibilityInfo` no nativo. Mudanças da preferência durante a execução interrompem e restauram os valores. Listeners e animações são limpos ao desmontar/perder foco.

## Conferir manualmente

1. Em 390 px, passe por Início, Descobrir, Criar, Salvos e Perfil. Volte a uma aba já visitada. O conteúdo entra suavemente, sem esconder os controles de navegação.
2. Digite em Buscar obras, mude de aba e volte. O texto continua lá. A camada de movimento não remonta o formulário nem substitui o estado das telas.
3. Pressione e solte um filtro, uma aba ou um botão. Confira o retorno ao estado normal. Em Perfil, abra Entrar ou criar conta e volte pelo navegador.
4. Em Início, alterne Livros e Tudo. Confira a entrada dos cards, sem tentar abrir os exemplos locais como obras reais.
5. Repita em 1440 px com a navegação lateral. Confira teclado/Enter, foco e ausência de overflow horizontal.
6. Ative Reduzir movimento no sistema ou em DevTools > Rendering > Emulate CSS media feature prefers-reduced-motion. Troque abas e filtre. O movimento deve desaparecer. Desative e reative durante uma transição.
7. Antes de produção, repetir em iOS/Android reais, incluindo leitor de tela, teclado, gestos de voltar e aparelhos menos rápidos. O uso do driver nativo não é um benchmark de desempenho.

## Teste reproduzível no navegador

Requer Chrome, FFmpeg para a gravação opcional, e `puppeteer-core` como ferramenta de teste local. Em uma cópia descartável:

```sh
npm install --no-save --package-lock=false puppeteer-core
EXPO_NO_DOTENV=1 npx expo export --platform web --output-dir dist-motion
CHROME_PATH=/caminho/do/chrome node scripts/verify-motion-ui.mjs dist-motion
```

No PowerShell, defina as mesmas variáveis com `$env:EXPO_NO_DOTENV = '1'` e `$env:CHROME_PATH = 'C:\caminho\chrome.exe'` antes dos comandos, e remova-as ao terminar. Para gerar o vídeo de revisão, defina também `RECORD_MOTION=1`. O teste salva capturas e amostras por frame em `motion-evidence/`. Esses artefatos são locais, não fazem parte do código publicado. O teste bloqueia requisições externas e não usa um banco real.

Os scripts anteriores de detalhes e amizades continuam disponíveis. O roteiro para executar o bundle isolado deles está em `docs/review-all-four.md`. Suas respostas de rede são interceptadas: não aprovam o Supabase/RLS real.

## Validação desta rodada

- Instalação limpa com `npm ci --ignore-scripts`; TypeScript sem erros; 17 testes Node passando.
- Export web normal e export isolado de testes concluídos.
- Chrome: amostras por frame confirmaram a entrada e o repouso nas cinco abas e nas revisitas. Preferência de reduzir movimento alterada ao vivo, inclusive no meio da transição. Teclado/Enter, texto preservado na busca, toque/retorno, filtros, rota de login e voltar, 390/1440 px sem overflow.
- Vídeo vertical do bundle real e sequência temporal de frames inspecionados. Movimento sutil, sem zoom de tela ou parallax.
- Regressões isoladas de detalhes e amizades passaram novamente. Nenhuma escrita no Supabase real.

O relatório de auditoria desta instalação limpa apontou **3 vulnerabilidades moderadas, 0 altas e 0 críticas**. Esse resultado atual difere do registro histórico da rodada anterior. `package.json` e `package-lock.json` continuam idênticos à base: esta rodada não corrigiu nem atualizou dependências. Contagens dependem dos avisos retornados pelo registry no momento da verificação; reavaliar antes de produção.

Não houve validação em aparelho iOS/Android físico, benchmark de FPS, aprovação do backend/RLS, merge ou deploy. `.env`, banco, credenciais e migrations não foram alterados.

## Bloco de encerramento

Antes de editar, README.md, docs/architecture.md e o código existente foram lidos. O trabalho está em branch própria. Nenhum `.env` foi alterado e nenhuma credencial foi exposta. TypeScript e testes foram executados com os limites acima. PR para revisão, sem merge e sem publicação automática.

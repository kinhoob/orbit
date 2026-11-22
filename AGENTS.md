# ORBIT

Aplicativo social de descobertas culturais em React Native, Expo Router, TypeScript e Supabase. Repositório: `kinhoob/orbit`. Leia `docs/cloud-development.md` antes de configurar outro ambiente e `docs/login-validation.md` antes de alterar autenticação ou onboarding.

## Desenvolvimento

- Instale as dependências com `npm ci`, preservando o lockfile.
- Verifique alterações com `npm run typecheck` e `npm test`.
- Inicie a versão web com `npm run web -- --port 8081`. A prévia precisa encaminhar a porta do ambiente em nuvem.
- Use `.env.example` como referência para as variáveis. Nunca publique `.env`, senhas, tokens de sessão, chaves secretas ou service_role.
- Não execute o inicializador PowerShell em ambientes Linux; use os comandos npm.

## Banco e autenticação

- O banco remoto é o Supabase ORBIT, projeto `nucqxkgfruvdrzifstsu`. Não confundir com FluxQr.
- A migração `20261122053354_login_preferences.sql` já foi aplicada ao ORBIT. Inspecione esquema e histórico antes de aplicar novas migrations: parte do esquema anterior foi aplicada manualmente e não está registrada no histórico remoto.
- GitHub contém o código, os testes e o SQL; acesso ao GitHub não concede acesso administrativo ao Supabase.
- A sessão é verificada pelo Auth. Perfil, preferências e avaliações são consultados antes de liberar a área da conta. Não substitua essas verificações por valores locais de conclusão.
- Os gêneros são persistidos em `account_settings.taste_genres`; o progresso depende de cinco obras distintas avaliadas no servidor.
- Preserve as políticas RLS por usuário. Não libere tabelas privadas para anon para contornar erros.
- Os testes remotos registrados na documentação foram feitos em transação revertida. Não crie pessoas ou avaliações fictícias persistentes para demonstrar funcionamento.
- Não afirme que confirmação de e-mail, login real ou uma tela foram testados quando apenas testes de unidade, SQL ou compilação foram executados.

## Interface

- Barra inferior apenas com ícones e seleção clara fluida sincronizada ao deslize das telas; respeitar movimento reduzido.
- Busca com duas obras por linha, capas e áreas de texto de tamanhos iguais; informações básicas antes do clique e detalhes completos ao abrir.
- Preserve as alterações existentes e a organização atual das rotas. A documentação antiga do README contém descrições históricas; os arquivos atuais e os guias acima são a referência para a implementação.

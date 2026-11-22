# Trabalhar no ORBIT com outra IA na nuvem

## Conectar o código

Na plataforma da outra IA, conecte sua conta do GitHub e autorize o repositório `kinhoob/orbit`. Se o repositório for privado, a integração precisa receber acesso explícito a ele. Selecione a branch `main` como base. Uma integração de leitura pode consultar o código; para executar testes, iniciar o app e criar commits, a plataforma também precisa oferecer um ambiente de execução e as permissões de escrita adequadas.

O projeto pode ser clonado em um ambiente de execução:

```sh
git clone https://github.com/kinhoob/orbit.git
cd orbit
npm ci
npm run typecheck
npm test
npm run web -- --port 8081
```

Use uma versão de Node compatível com as dependências Expo do lockfile. O teste local mais recente usou Node 26. A prévia web deve encaminhar a porta 8081; `localhost` no ambiente remoto não é o computador do usuário.

## Configurar a conexão do aplicativo

Configure no ambiente da plataforma, usando `.env.example` como referência:

| Variável | Valor necessário |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto ORBIT no Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública/publicável desse projeto |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | Opcional e específico da plataforma. Web usa a origem atual + `/auth/callback` quando vazio; builds mobile com scheme registrado usam `orbit://auth/callback` |

A URL de callback precisa constar nas URLs permitidas do Supabase Auth. Reinicie o Expo quando alterar as variáveis. Os valores reais não são copiados automaticamente do PC pelo GitHub. A IA pode rodar os testes locais sem Supabase, mas consultas reais exigem a configuração acima. Guarde credenciais no gerenciador de variáveis/segredos da plataforma; não as coloque em commits ou prompts.

## Acessar e alterar o banco

O banco e as contas ficam no Supabase, separados do GitHub. Para consultar o esquema ou aplicar migrations, conecte a integração Supabase na outra plataforma e conceda acesso ao projeto ORBIT (`nucqxkgfruvdrzifstsu`). Prefira o conector/MCP autorizado. A chave pública do app mantém as regras RLS e não dá permissão para administrar o banco.

O diretório `supabase/migrations/` documenta alterações de estrutura. Ele não é uma cópia dos dados, das contas, do Storage nem de todas as configurações de Auth. O projeto existente tem migrations antigas aplicadas manualmente: conferir o esquema e o histórico antes de executar `db push` ou reaplicar arquivos.

A migração de gostos `20261122053354_login_preferences.sql` já foi aplicada no projeto ORBIT. Os resultados e limites da validação estão em [login-validation.md](login-validation.md). Para checks de leitura pelo app, use `node --env-file=.env scripts/verify-supabase.mjs` se tiver configurado `.env`, ou `node scripts/verify-supabase.mjs` com as variáveis injetadas pela plataforma.

## Orientação para a outra IA

Copie esta mensagem depois de conectar o repositório:

> Trabalhe no repositório kinhoob/orbit, usando a main como base. Primeiro leia AGENTS.md, docs/cloud-development.md e docs/login-validation.md. Instale com npm ci, execute typecheck e testes e verifique o estado atual antes de alterar algo. Use as variáveis do ambiente para o aplicativo. Para trabalhar no banco, use a conexão Supabase autorizada ao projeto ORBIT e inspecione esquema e migrations antes de modificar. Preserve os dados, as políticas RLS e a interface existente. Faça as mudanças em uma branch e entregue um PR com a validação realizada.

## Referências

- [Autorizar uma integração GitHub em repositórios específicos](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party).
- [Armazenar variáveis e segredos de desenvolvimento em Codespaces](https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/managing-development-environment-secrets-for-your-repository-or-organization).

Preparação de segurança/callbacks ainda não aplicada: [access-preparation.md](access-preparation.md).

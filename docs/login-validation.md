# Login conectado ao Supabase

O app valida a sessão restaurada usando Auth.getUser, exige confirmação de e-mail e verifica a identidade devolvida pelo servidor. Antes de abrir as áreas da conta, consulta o perfil, as configurações e a contagem de avaliações dessa pessoa. Erros de consulta exibem uma opção de tentar novamente; um registro local não libera o acesso.

A escolha de gostos salva os gêneros em account_settings.taste_genres. O progresso retoma as avaliações já gravadas e a conclusão depende de cinco obras distintas no servidor. Seleções locais antigas não são promovidas automaticamente a dados confirmados.

## Preparação do banco

A migração `supabase/migrations/20261122053354_login_preferences.sql` foi aplicada ao projeto ORBIT em 22/11/2026, pela integração Supabase. O SQL adiciona a coluna de gêneros se necessário, cria configurações para perfis existentes e mantém a criação de perfil/configurações para novos cadastros. As políticas de acesso da migration account_universe continuam em vigor. Não muda configurações de Auth nem remove dados.

A aplicação foi registrada no histórico remoto como `20261122053354 / login_preferences`; o arquivo local usa a mesma versão. O app continua usando somente a chave pública. A integração administrativa não fornece segredos ao app.

Verificação remota: criação automática de perfil e configurações; gravação e leitura de gêneros; bloqueio de leitura e alteração das preferências de outra conta; bloqueio de troca do proprietário; gravação de cinco avaliações distintas e contagem no servidor. Todos passaram em uma transação revertida. Nenhuma conta ou avaliação de teste foi persistida. O projeto tinha zero usuários reais, portanto confirmação por e-mail e login com senha ainda precisam de uma conta real para o teste completo.

Os verificadores de saúde não apontaram avisos. A revisão de segurança não introduziu novos alertas, mas preservou avisos existentes para `is_blocked` e `are_friends`, funções SECURITY DEFINER expostas a anon e authenticated e usadas pelas políticas sociais. A mudança de esquema e a revisão dessas funções são assuntos separados: revogar suas permissões sem ajustar as políticas pode quebrar leituras públicas. Referências: [execução por visitantes](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) e [execução por usuários autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Verificação

`node --env-file=.env scripts/verify-supabase.mjs` verifica Auth, acesso público, bloqueio de acesso anônimo às tabelas privadas e disponibilidade do catálogo. Não cria pessoas nem avaliações.

Com uma conta de teste existente, fornecer ORBIT_TEST_EMAIL e ORBIT_TEST_PASSWORD somente no ambiente do terminal para incluir leituras autenticadas. Não salvar a senha no código, enviar por chat nem versionar esses valores. O script não imprime credenciais ou dados pessoais.

Depois da migração, testar no app: cadastro e confirmação por e-mail; login; seleção de gêneros; cinco avaliações; saída e novo login; retomada de uma conta com menos de cinco avaliações; entrada em outro dispositivo. O callback configurado no .env precisa estar permitido em Auth > URL Configuration. Alterar a exigência de confirmação e a política de senha do servidor requer acesso administrativo ao projeto.

Os testes locais usam respostas controladas para cobrir sessão revogada, conta incorreta, e-mail pendente, consultas negadas, falha de armazenamento local e gravação/retomada de preferências. Eles não substituem o teste de um login real com as políticas remotas.

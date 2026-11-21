-- EM REVISÃO (21/11/2026): ainda não aplicado ao projeto. Persistência
-- server-side dos gêneros escolhidos na etapa de gostos; hoje a seleção fica
-- só no dispositivo (AsyncStorage) até esta migração ser revisada e aplicada
-- pelo responsável. Os gêneros guiam sugestões; a compatibilidade continua
-- saindo somente das notas reais em obras em comum.
begin;
alter table public.account_settings
  add column if not exists taste_genres text[] not null default '{}';
commit;

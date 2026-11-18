begin;
-- Criador (diretor, artista, autor) das obras do catalogo, preenchido pela
-- importacao CC0 (scripts/catalog-import). Coluna aditiva, default vazio:
-- linhas existentes continuam validas.
alter table public.media_items add column if not exists creator text not null default '';
commit;

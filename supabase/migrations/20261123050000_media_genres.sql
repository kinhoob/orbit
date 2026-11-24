-- Gêneros por obra (pedido do Marco em 23/11/2026): os cards da linha do
-- tempo passam a mostrar capa, tipo, ano, autor e gêneros. Mesmos ids da
-- taxonomia de gostos (src/features/catalog/genres.mjs). Vazio = sem gênero
-- informado; a interface simplesmente omite os chips, nunca inventa.
alter table public.media_items add column if not exists genres text[] not null default '{}';

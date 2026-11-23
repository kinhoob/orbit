-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Gêneros por obra nos cards da linha do tempo (23/11/2026).
begin;
insert into public.media_items(id,title,category,genres) values
 ('d3333333-3333-4333-8333-333333333301','Obra com gênero','film',array['film-drama','film-historia']);
insert into public.media_items(id,title,category) values
 ('d3333333-3333-4333-8333-333333333302','Obra sem gênero','music');
do $$ begin
 if (select genres from public.media_items where id='d3333333-3333-4333-8333-333333333301') <> array['film-drama','film-historia']::text[] then
  raise exception 'Genres not stored on media_items';
 end if;
 if (select genres from public.media_items where id='d3333333-3333-4333-8333-333333333302') <> '{}'::text[] then
  raise exception 'Default genres changed';
 end if;
end $$;
rollback;

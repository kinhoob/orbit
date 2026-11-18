-- Catalogo CC0 de demonstracao (AMOSTRA real, nao o catalogo completo).
-- Fontes: Wikidata (CC0, https://www.wikidata.org/wiki/Wikidata:Licensing) e
-- MusicBrainz (CC0, https://musicbrainz.org/doc/MusicBrainz_Database/Download).
-- Capas continuam ilustradas (cover_url null): nenhuma fonte de arte tem
-- licenca comercial verificada. Regenerar: node scripts/catalog-import/generate-seed.mjs
begin;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Thriller', 'Michael Jackson', 'album'::public.media_category, 'Importado do MusicBrainz (CC0): https://musicbrainz.org/release-group/3a7817b5-22cb-32c3-a31b-2c8309fbf92e', null, 1983, 'musicbrainz', '3a7817b5-22cb-32c3-a31b-2c8309fbf92e')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Rumours', 'Fleetwood Mac', 'album'::public.media_category, 'Importado do MusicBrainz (CC0): https://musicbrainz.org/release-group/416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', null, 1977, 'musicbrainz', '416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Kind of Blue', 'Miles Davis', 'album'::public.media_category, 'Importado do MusicBrainz (CC0): https://musicbrainz.org/release-group/8e8a594f-2175-38c7-a871-abb68ec363e7', null, 1959, 'musicbrainz', '8e8a594f-2175-38c7-a871-abb68ec363e7')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Abbey Road', 'The Beatles', 'album'::public.media_category, 'Importado do MusicBrainz (CC0): https://musicbrainz.org/release-group/9162580e-5df4-32de-80cc-f45a8d8a9b1d', null, 1969, 'musicbrainz', '9162580e-5df4-32de-80cc-f45a8d8a9b1d')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('OK Computer', 'Radiohead', 'album'::public.media_category, 'Importado do MusicBrainz (CC0): https://musicbrainz.org/release-group/b1392450-e666-3926-a536-22c65f834433', null, 1997, 'musicbrainz', 'b1392450-e666-3926-a536-22c65f834433')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Cowboy Bebop', '', 'anime'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q101244908', null, 1998, 'wikidata', 'Q101244908')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Breaking Bad', 'Vince Gilligan', 'series'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q1079', null, 2008, 'wikidata', 'Q1079')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('A Viagem de Chihiro', 'Hayao Miyazaki', 'anime'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q155653', null, 2001, 'wikidata', 'Q155653')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Cidade de Deus', 'Fernando Meirelles', 'film'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q220741', null, 2002, 'wikidata', 'Q220741')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('The Godfather', 'Francis Ford Coppola', 'film'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q47703', null, 1972, 'wikidata', 'Q47703')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)
values ('Parasite', 'Joon-Ho Bong', 'film'::public.media_category, 'Importado do Wikidata (CC0): https://www.wikidata.org/wiki/Q61448040', null, 2019, 'wikidata', 'Q61448040')
on conflict (external_source, external_id) do update set
  title = excluded.title, creator = excluded.creator, category = excluded.category,
  description = excluded.description, release_year = excluded.release_year;

commit;
-- 11 obras reais na amostra (6 Wikidata + 5 MusicBrainz).

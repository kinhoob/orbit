import test from 'node:test';
import assert from 'node:assert/strict';
import { genreLabelsFor } from '../src/features/catalog/genres.mjs';
import { isMissingColumnError } from '../src/domain/timelines.mjs';

test('genreLabelsFor rotula ids conhecidos na ordem salva', () => {
  assert.deepEqual(genreLabelsFor(['film-drama', 'film-historia'], 'film'), ['Drama', 'História']);
});

test('genreLabelsFor ignora ids desconhecidos e de outra categoria', () => {
  assert.deepEqual(genreLabelsFor(['film-drama', 'series-drama', 'id-inexistente'], 'film'), ['Drama']);
});

test('genreLabelsFor nao duplica rotulos e lida com entradas vazias', () => {
  assert.deepEqual(genreLabelsFor(['film-drama', 'film-drama'], 'film'), ['Drama']);
  assert.deepEqual(genreLabelsFor([], 'film'), []);
  assert.deepEqual(genreLabelsFor(null, 'film'), []);
  assert.deepEqual(genreLabelsFor(undefined), []);
});

test('isMissingColumnError reconhece Postgres e PostgREST', () => {
  assert.equal(isMissingColumnError({ code: '42703', message: 'column media_items.genres does not exist' }), true);
  assert.equal(isMissingColumnError({ code: 'PGRST204', message: "Could not find the 'genres' column of 'media_items' in the schema cache" }), true);
  assert.equal(isMissingColumnError({ message: 'column ratings.foo does not exist' }), true);
  assert.equal(isMissingColumnError(null), false);
  assert.equal(isMissingColumnError({ code: '42P01', message: 'relation does not exist' }), false);
});

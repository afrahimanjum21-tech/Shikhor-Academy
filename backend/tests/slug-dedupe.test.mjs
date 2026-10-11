import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSlugs, slugify } from '../migrations/007-success-story-slugs.mjs';

// §H/E — success-story slug backfill: collisions resolved against existing DB
// slugs AND same-run values; deterministic; rerun-safe. Pure.

test('slugify normalizes names (and falls back to "story")', () => {
  assert.equal(slugify('Rahim Uddin'), 'rahim-uddin');
  assert.equal(slugify('  '), 'story');
  assert.equal(slugify('A/B & C'), 'a-b-c');
});

test('a generated slug that clashes with an EXISTING db slug gets a suffix', () => {
  const out = resolveSlugs(['rahim-uddin'], [{ id: 1, student_name: 'Rahim Uddin' }]);
  assert.deepEqual(out, [{ id: 1, slug: 'rahim-uddin-2' }]);
});

test('two rows with the same name get distinct deterministic slugs', () => {
  const out = resolveSlugs([], [
    { id: 1, student_name: 'Rahim' },
    { id: 2, student_name: 'Rahim' },
    { id: 3, student_name: 'Rahim' },
  ]);
  assert.deepEqual(out.map(o => o.slug), ['rahim', 'rahim-2', 'rahim-3']);
});

test('existing + same-run collisions are BOTH avoided', () => {
  const out = resolveSlugs(['rahim', 'rahim-2'], [
    { id: 10, student_name: 'Rahim' },
    { id: 11, student_name: 'Rahim' },
  ]);
  assert.deepEqual(out.map(o => o.slug), ['rahim-3', 'rahim-4']);
});

test('rerun with nothing to backfill yields [] (idempotent) and never reuses a slug', () => {
  assert.deepEqual(resolveSlugs(['rahim', 'karim'], []), []);
  // a distinct name keeps its clean slug
  assert.deepEqual(resolveSlugs(['rahim'], [{ id: 2, student_name: 'Karim' }]), [{ id: 2, slug: 'karim' }]);
});

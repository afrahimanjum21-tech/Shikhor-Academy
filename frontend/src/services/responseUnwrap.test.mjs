import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUnwrap, cleanPath, matchesPath, invalidationNamespace, keyPathInvalidated } from './responseUnwrap.js';

/**
 * Regression tests for the Admin Student Manager pagination bug. Root cause:
 * the GET cache attached pagination metadata as non-index properties on the
 * UNWRAPPED array, which JSON.stringify drops when the cache is persisted to
 * sessionStorage — so after a reload the metadata vanished, total fell back to
 * the page length (20) and last_page to 1, leaving only the first 20 students
 * reachable. The fix caches the raw envelope (a plain object) and rebuilds the
 * metadata on every delivery via applyUnwrap. These tests pin that behaviour.
 */

const STUDENTS = '/admin/students';
const envelope = (items, meta) => ({ data: items, ...meta });
const rows = (n, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: offset + i + 1 }));

test('unwraps /admin/students to the array and attaches pagination metadata', () => {
  const data = applyUnwrap(envelope(rows(20), { total: 57, current_page: 1, last_page: 3, per_page: 20 }), STUDENTS);
  assert.ok(Array.isArray(data));
  assert.equal(data.length, 20);
  assert.equal(data.total, 57);
  assert.equal(data.current_page, 1);
  assert.equal(data.last_page, 3);
  assert.equal(data.per_page, 20);
});

test('FIX: metadata survives a cached-envelope JSON round-trip (persist + hydrate)', () => {
  const payload = envelope(rows(20), { total: 57, current_page: 2, last_page: 3, per_page: 20 });
  const cached = JSON.parse(JSON.stringify(payload)); // what sessionStorage stores/restores
  const data = applyUnwrap(cached, STUDENTS);
  assert.equal(data.last_page, 3, 'last_page must survive so pages 2 and 3 stay reachable');
  assert.equal(data.total, 57);
  assert.equal(data.current_page, 2);
});

test('REGRESSION: the OLD approach (metadata on the array) is lost through JSON', () => {
  const unwrapped = applyUnwrap(envelope(rows(20), { total: 57, last_page: 3 }), STUDENTS);
  const afterPersist = JSON.parse(JSON.stringify(unwrapped)); // old cache stored the array
  assert.equal(afterPersist.total, undefined, 'array props do NOT survive JSON — this was the bug');
  assert.equal(afterPersist.last_page, undefined);
});

test('empty result set -> [] with total 0 and last_page 0', () => {
  const data = applyUnwrap(envelope([], { total: 0, current_page: 1, last_page: 0, per_page: 20 }), STUDENTS);
  assert.equal(data.length, 0);
  assert.equal(data.total, 0);
  assert.equal(data.last_page, 0);
});

test('final page: fewer rows than per_page, metadata intact after round-trip', () => {
  const payload = envelope(rows(17, 40), { total: 57, current_page: 3, last_page: 3, per_page: 20 });
  const data = applyUnwrap(JSON.parse(JSON.stringify(payload)), STUDENTS);
  assert.equal(data.length, 17);
  assert.equal(data.current_page, 3);
  assert.equal(data.last_page, 3);
});

test('filtered result set: total reflects the filtered count', () => {
  const data = applyUnwrap(envelope(rows(3), { total: 3, current_page: 1, last_page: 1, per_page: 20 }), STUDENTS);
  assert.equal(data.total, 3);
  assert.equal(data.last_page, 1);
});

test('always-unwrap object endpoint returns the inner object (no metadata attach)', () => {
  const data = applyUnwrap({ data: { stats: { students: 5 } } }, '/student/dashboard');
  assert.deepEqual(data, { stats: { students: 5 } });
});

test('non-configured path is returned unchanged (not unwrapped)', () => {
  const payload = { data: [1, 2, 3], total: 3 };
  assert.equal(applyUnwrap(payload, '/some/unlisted/endpoint'), payload);
});

test('path matching never confuses /admin/student/ with /admin/students', () => {
  assert.equal(cleanPath('/admin/students?page=2'), '/admin/students');
  assert.equal(matchesPath('/admin/students', '/admin/student/'), false);
  assert.equal(matchesPath('/admin/student/5/documents', '/admin/student/'), true);
  const data = applyUnwrap({ data: [{ id: 1 }], total: 1 }, '/admin/students');
  assert.ok(Array.isArray(data));
  assert.equal(data.total, 1);
});

// --- Q: API response-contract shapes handled consistently -------------------

test('contract: a bare array / bare object is returned UNCHANGED (not double-unwrapped)', () => {
  // Routine create returns a bare object the UI reads as `data.id`.
  const bareObj = { id: 7, day: 'Saturday' };
  assert.equal(applyUnwrap(bareObj, '/admin/routines'), bareObj);
  // A bare array (no {data}) is passed through untouched.
  const bareArr = [{ id: 1 }];
  assert.equal(applyUnwrap(bareArr, '/public/course-categories'), bareArr);
});

test('contract: {settings}/{message} envelopes are not mistaken for {data}', () => {
  const payload = { message: 'ok', settings: { store_id: 'x' } };
  assert.equal(applyUnwrap(payload, '/admin/payment-settings'), payload); // untouched
});

// --- I-10: cache invalidation covers paginated + child keys -----------------

test('invalidationNamespace = first two path segments', () => {
  assert.equal(invalidationNamespace('/admin/students'), '/admin/students');
  assert.equal(invalidationNamespace('/admin/students/5'), '/admin/students');
  assert.equal(invalidationNamespace('/admin/course-categories/3/toggle-active'), '/admin/course-categories');
});

test('I-10: a mutation invalidates paginated + child keys of the namespace', () => {
  const ns = invalidationNamespace('/admin/students');
  assert.equal(keyPathInvalidated('/admin/students', ns), true);
  assert.equal(keyPathInvalidated('/admin/students?page=2&limit=20', ns), true, 'paginated key must be cleared');
  assert.equal(keyPathInvalidated('/admin/students/5', ns), true);
  assert.equal(keyPathInvalidated('/admin/teachers', ns), false, 'unrelated namespace untouched');
  assert.equal(keyPathInvalidated('/admin/students-archive', ns), false, 'no partial-prefix false match');
});

test('I-10: cross-invalidation clears the paired public feed (and its pages)', () => {
  const ns = invalidationNamespace('/admin/notices');
  assert.equal(keyPathInvalidated('/public/notices?page=1', ns, ['/public/notices']), true);
  assert.equal(keyPathInvalidated('/public/success-stories', ns, ['/public/notices']), false);
});

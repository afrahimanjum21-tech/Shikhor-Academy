import test from 'node:test';
import assert from 'node:assert/strict';
import { responsePayload } from './attendanceResponse.js';

test('unwraps the { data } envelope used by manual attendance endpoints', () => {
  const inner = { batch: { id: 1 }, students: [] };
  assert.deepEqual(responsePayload({ data: { message: 'ok', data: inner } }), inner);
});

test('passes through responses that were already unwrapped by the API client', () => {
  const inner = { batch: { id: 1 }, students: [] };
  assert.deepEqual(responsePayload({ data: inner }), inner);
});

test('returns undefined for a missing response and null for a null data envelope', () => {
  assert.equal(responsePayload(undefined), undefined);
  assert.equal(responsePayload({ data: { data: null } }), null);
});

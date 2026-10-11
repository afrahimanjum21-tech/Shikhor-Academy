import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBool } from '../utils/parseBool.js';

// C11 — strict boolean parsing (the Boolean('false') trap).

test('parseBool: only true / "true" / 1 / "1" are truthy', () => {
  for (const v of [true, 'true', 1, '1']) assert.equal(parseBool(v), true, `expected truthy: ${JSON.stringify(v)}`);
});

test('parseBool: the string "false" (and other falsy inputs) are false', () => {
  for (const v of [false, 'false', 0, '0', '', 'no', undefined, null]) {
    assert.equal(parseBool(v), false, `expected false: ${JSON.stringify(v)}`);
  }
});

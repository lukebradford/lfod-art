// The outcome strings Four cells and Five cells are recorded in, and the words they become.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOutcome, phrase } from '../site/js/outcomes.js';

test('parseOutcome reads explosions, vanishing and lists of objects', () => {
  assert.deepEqual(parseOutcome('explodes'), { at: null, kind: 'explodes', objects: {} });
  assert.deepEqual(parseOutcome('12:nothing'), { at: 12, kind: 'nothing', objects: {} });
  assert.deepEqual(parseOutcome('26:checker×4 freeship×2'), { at: 26, kind: 'objects', objects: { checker: 4, freeship: 2 } });
  assert.deepEqual(parseOutcome('15:checker dot'), { at: 15, kind: 'objects', objects: { checker: 1, dot: 1 } });
});

test('phrase puts objects in words, biggest first', () => {
  assert.equal(phrase({ dot: 2, moon: 1 }), 'a moon and two dots');
  assert.equal(phrase({ checker: 4, freeship: 2 }), 'two free ships and four checkers');
  assert.equal(phrase({ anchor: 1 }), 'an anchor');
  assert.equal(phrase({ dot: 3, checker: 1, puffer: 2 }), 'two double dot puffers, a checker and three dots');
});

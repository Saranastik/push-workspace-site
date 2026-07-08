import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRuDay, dayStatus } from '../js/lib/dates.js';

const ref = new Date('2026-07-08T12:00:00');

test('parseRuDay разбирает «8 июля» и «06.07»', () => {
  assert.equal(parseRuDay('8 июля', ref).getTime(), new Date(2026, 6, 8).getTime());
  assert.equal(parseRuDay('06.07', ref).getTime(), new Date(2026, 6, 6).getTime());
  assert.equal(parseRuDay('Крейзи сейл', ref), null);
  assert.equal(parseRuDay('', ref), null);
});

test('dayStatus: прошло / сегодня / скоро', () => {
  assert.equal(dayStatus(new Date(2026, 6, 6), ref), 'past');
  assert.equal(dayStatus(new Date(2026, 6, 8), ref), 'today');
  assert.equal(dayStatus(new Date(2026, 6, 12), ref), 'upcoming');
  assert.equal(dayStatus(null, ref), null);
});

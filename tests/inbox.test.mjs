import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRequest, validateResult } from '../js/lib/inbox.js';

test('makeRequest формирует id и путь', () => {
  const r = makeRequest('analyze', 'Заголовок: X', '', new Date('2026-07-08T15:27:00+03:00'));
  assert.match(r.id, /^\d{8}-\d{6}$/);
  assert.equal(r.path, `inbox/${r.id}.json`);
  assert.equal(r.json.action, 'analyze');
  assert.equal(r.json.text, 'Заголовок: X');
});

test('makeRequest отклоняет пустой текст и неизвестный action', () => {
  assert.throws(() => makeRequest('analyze', '  ', ''));
  assert.throws(() => makeRequest('оценить', 'x', ''));
});

test('validateResult принимает валидный объект', () => {
  const good = { id: 'a', action: 'analyze', status: 'ok', items: [], summary: 's' };
  assert.equal(validateResult(good).ok, true);
});

test('validateResult отклоняет пустой объект и неверный status', () => {
  assert.equal(validateResult({}).ok, false);
  assert.equal(validateResult({ id: 'a', action: 'analyze', status: 'wat' }).ok, false);
});

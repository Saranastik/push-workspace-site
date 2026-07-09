import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRequest, validateResult, parseResultJson, runStateForRequest } from '../js/lib/inbox.js';

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

test('parseResultJson разбирает валидный JSON', () => {
  const r = parseResultJson('{"id":"a","status":"ok"}');
  assert.equal(r.ok, true);
  assert.equal(r.value.id, 'a');
});

test('parseResultJson не бросает исключение на битом JSON', () => {
  // реальный кейс: неэкранированные кавычки внутри строки
  const broken = '{"comment": "Два глагола через "и" — запрещено"}';
  const r = parseResultJson(broken);
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, 'string');
});

test('runStateForRequest игнорирует чужой упавший запуск', () => {
  // реальный кейс: последний запуск — старый провал, а наш ещё не стартовал
  const runs = [{ display_title: 'request 20260708-191616 (analyze)', status: 'completed', conclusion: 'failure' }];
  assert.equal(runStateForRequest(runs, '20260710-120000').state, 'queued');
});

test('runStateForRequest находит свой запуск по id', () => {
  const runs = [
    { display_title: 'request 20260710-120500 (custom)', status: 'in_progress', conclusion: null },
    { display_title: 'request 20260710-120000 (analyze)', status: 'completed', conclusion: 'failure' },
  ];
  assert.equal(runStateForRequest(runs, '20260710-120500').state, 'working');
  assert.equal(runStateForRequest(runs, '20260710-120000').state, 'failed');
});

test('runStateForRequest: завершённый успешный запуск и пустой список', () => {
  const runs = [{ display_title: 'request 20260710-120000 (analyze)', status: 'completed', conclusion: 'success' }];
  assert.equal(runStateForRequest(runs, '20260710-120000').state, 'finished');
  assert.equal(runStateForRequest([], '20260710-120000').state, 'queued');
});

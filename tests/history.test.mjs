import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHistory, monthlyStats, topByCtr } from '../js/lib/history.js';

const MD = `# База пушей — история

## Декабрь 2025

| Дата | Заголовок | Текст | Доставлено | CTR |
|------|-----------|-------|-----------|-----|
| 05.12 | Новое приложение | Ozon Селект. Скачать | 22 640 707 | 2,9% |
| 19.12 | Ничего лишнего | Только качество | 20 715 895 | 0,9% |

## Январь 2026

| Дата | Заголовок | Текст | Доставлено | CTR |
|------|-----------|-------|-----------|-----|
| 23.01 (жен) | Вы долго искали | приложение | 10 780 794 | 2,0% |

## Февраль 2026

| Дата | Заголовок | Текст | Доставлено | CTR |
|------|-----------|-------|-----------|-----|
| 26.02 | Стилист | образы для вас | 2 510 590 | **4,0%** |
`;

test('parseHistory: строки, месяцы, числа', () => {
  const rows = parseHistory(MD);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], {
    month: 'Декабрь 2025',
    date: '05.12',
    title: 'Новое приложение',
    text: 'Ozon Селект. Скачать',
    delivered: 22640707,
    ctr: 2.9,
  });
  assert.equal(rows[2].month, 'Январь 2026');
  assert.equal(rows[2].date, '23.01 (жен)');
});

test('monthlyStats и topByCtr', () => {
  const rows = parseHistory(MD);
  const st = monthlyStats(rows);
  assert.equal(st.length, 3);
  assert.equal(st[0].count, 2);
  assert.ok(Math.abs(st[0].avgCtr - 1.9) < 1e-9);
  assert.equal(topByCtr(rows, 1)[0].title, 'Стилист');
});

test('parseHistory: жирное выделение **4,0%** не ломает числа', () => {
  const rows = parseHistory(MD);
  const star = rows.find(r => r.title === 'Стилист');
  assert.equal(star.ctr, 4.0);
  assert.equal(star.delivered, 2510590);
});

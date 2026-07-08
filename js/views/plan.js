import { registerView } from '../registry.js';
import { parseRuDay, dayStatus } from '../lib/dates.js';
import { pageHeader } from '../ui.js';

// Подсветка дней в промоплане: «### 8 июля» → бейдж прошло/сегодня/скоро,
// прошедшие блоки приглушаются. Только оформление, текст не меняется.
const DAY_LABELS = { past: 'прошло', today: 'сегодня', upcoming: 'скоро' };

function decoratePlanDays(container, now = new Date()) {
  container.querySelectorAll('h3').forEach(h => {
    const st = dayStatus(parseRuDay(h.textContent, now), now);
    if (!st) return;
    h.classList.add('plan-day');
    const b = document.createElement('span');
    b.className = `badge badge-${st}`;
    b.textContent = DAY_LABELS[st];
    h.appendChild(b);
    if (st !== 'past') return;
    h.classList.add('day-past');
    let n = h.nextElementSibling;
    while (n && !/^H[1-3]$/.test(n.tagName) && n.tagName !== 'HR') {
      n.classList.add('day-past');
      n = n.nextElementSibling;
    }
  });

  // Таблицы с колонкой «Дата» (например, этапы акции): бейдж в ячейке даты.
  container.querySelectorAll('table').forEach(t => {
    const firstTh = t.querySelector('th');
    if (!firstTh || firstTh.textContent.trim() !== 'Дата') return;
    t.querySelectorAll('tbody tr').forEach(tr => {
      const cell = tr.querySelector('td');
      if (!cell) return;
      const st = dayStatus(parseRuDay(cell.textContent), now);
      if (!st) return;
      const b = document.createElement('span');
      b.className = `badge badge-${st}`;
      b.textContent = DAY_LABELS[st];
      cell.appendChild(b);
      if (st === 'past') tr.classList.add('day-past');
    });
  });
}

registerView('plan', {
  async mount(el, gh) {
    el.innerHTML = '<p>Загрузка…</p>';

    const planMd = await gh.getRaw('Пуши/Промоплан.md');

    el.innerHTML = `
      ${pageHeader('Промоплан', 'План рассылок на текущий месяц')}
      <div class="md" id="plan-md">${planMd ? marked.parse(planMd) : '<p class="error">Файл не найден.</p>'}</div>`;

    if (planMd) decoratePlanDays(el.querySelector('#plan-md'));
  },
});

import { registerView } from '../registry.js';
import { parseHistory } from '../lib/history.js';
import { parseRuDay, dayStatus } from '../lib/dates.js';
import { pageHeader, esc, ctrClass } from '../ui.js';

function fmt(n) {
  if (n === null) return '—';
  return n.toLocaleString('ru-RU');
}

function rowHtml(r) {
  return `
    <tr>
      <td>${esc(r.date)}</td>
      <td>${esc(r.title)}</td>
      <td>${esc(r.text)}</td>
      <td>${fmt(r.delivered)}</td>
      <td class="${ctrClass(r.ctr)}">${r.ctr !== null ? r.ctr.toFixed(1) + '%' : '—'}</td>
    </tr>`;
}

function renderTable(rows) {
  if (!rows.length) return '<p>Нет данных.</p>';
  return `
    <div class="hist-table data-table">
      <table>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Заголовок</th>
            <th>Текст</th>
            <th data-sort="delivered" style="cursor:pointer">Доставлено ↕</th>
            <th data-sort="ctr" style="cursor:pointer">CTR ↕</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join('')}
        </tbody>
      </table>
    </div>`;
}

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

    const [planMd, histMd] = await Promise.all([
      gh.getRaw('Пуши/Промоплан.md'),
      gh.getRaw('Пуши/База пушей/история.md'),
    ]);

    let allRows = histMd ? parseHistory(histMd) : [];
    let sortKey = null, sortDir = 1;

    function filtered(query) {
      if (!query) return allRows;
      const q = query.toLowerCase();
      return allRows.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.text || '').toLowerCase().includes(q) ||
        (r.month || '').toLowerCase().includes(q)
      );
    }

    function sorted(rows) {
      if (!sortKey) return rows;
      return [...rows].sort((a, b) => {
        const av = a[sortKey] ?? -Infinity, bv = b[sortKey] ?? -Infinity;
        return (av - bv) * sortDir;
      });
    }

    function render() {
      const q = el.querySelector('#hist-search')?.value ?? '';
      const tbody = el.querySelector('.hist-table table tbody');
      if (!tbody) return;
      const rows = sorted(filtered(q));
      tbody.innerHTML = rows.map(rowHtml).join('');
      const count = el.querySelector('#hist-count');
      if (count) count.textContent = `${rows.length} из ${allRows.length}`;
    }

    el.innerHTML = `
      ${pageHeader('Промоплан и история', 'План на текущий месяц и все прошлые рассылки')}
      <section>
        <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:14px">Промоплан</h2>
        <div class="md" id="plan-md">${planMd ? marked.parse(planMd) : '<p class="error">Файл не найден.</p>'}</div>
      </section>

      <section style="margin-top:36px">
        <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:12px">История рассылок</h2>
        <div class="table-toolbar">
          <input id="hist-search" class="hist-filter" placeholder="Поиск по заголовку, тексту или месяцу…">
          <span class="count" id="hist-count">${allRows.length} из ${allRows.length}</span>
        </div>
        ${histMd ? renderTable(allRows) : '<p class="error">Файл истории не найден.</p>'}
      </section>`;

    if (planMd) decoratePlanDays(el.querySelector('#plan-md'));

    el.querySelector('#hist-search')?.addEventListener('input', render);

    el.querySelector('.hist-table')?.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (sortKey === key) { sortDir *= -1; }
      else { sortKey = key; sortDir = -1; }
      render();
    });
  },
});

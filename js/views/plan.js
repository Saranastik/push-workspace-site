import { registerView } from '../registry.js';
import { parseHistory } from '../lib/history.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function fmt(n) {
  if (n === null) return '—';
  return n.toLocaleString('ru-RU');
}

function renderTable(rows) {
  if (!rows.length) return '<p>Нет данных.</p>';
  return `
    <div class="hist-table">
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
          ${rows.map(r => `
            <tr>
              <td>${esc(r.date)}</td>
              <td>${esc(r.title)}</td>
              <td>${esc(r.text)}</td>
              <td>${fmt(r.delivered)}</td>
              <td>${r.ctr !== null ? r.ctr.toFixed(1) + '%' : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
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
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${esc(r.date)}</td>
          <td>${esc(r.title)}</td>
          <td>${esc(r.text)}</td>
          <td>${fmt(r.delivered)}</td>
          <td>${r.ctr !== null ? r.ctr.toFixed(1) + '%' : '—'}</td>
        </tr>`).join('');
    }

    el.innerHTML = `
      <section>
        <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:14px">Промоплан</h2>
        <div class="md">${planMd ? marked.parse(planMd) : '<p class="error">Файл не найден.</p>'}</div>
      </section>

      <section style="margin-top:36px">
        <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:12px">История рассылок</h2>
        <input id="hist-search" class="hist-filter" placeholder="Поиск по заголовку, тексту или месяцу…">
        ${histMd ? renderTable(allRows) : '<p class="error">Файл истории не найден.</p>'}
      </section>`;

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

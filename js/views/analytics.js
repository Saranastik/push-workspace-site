import { registerView } from '../registry.js';
import { parseHistory, monthlyStats, topByCtr } from '../lib/history.js';
import { pageHeader, esc, ctrClass } from '../ui.js';

function fmt(n) {
  if (n === null) return '—';
  return n.toLocaleString('ru-RU');
}

function histRowHtml(r) {
  return `
    <tr>
      <td>${esc(r.date)}</td>
      <td>${esc(r.title)}</td>
      <td>${esc(r.text)}</td>
      <td>${fmt(r.delivered)}</td>
      <td class="${ctrClass(r.ctr)}">${r.ctr !== null ? r.ctr.toFixed(1) + '%' : '—'}</td>
    </tr>`;
}

registerView('analytics', {
  async mount(el, gh) {
    el.innerHTML = '<p>Загрузка…</p>';

    const [histMd, analyticsMd] = await Promise.all([
      gh.getRaw('Пуши/База пушей/история.md'),
      gh.getRaw('Пуши/Аналитика.md'),
    ]);

    if (!histMd) { el.innerHTML = '<p class="error">Файл истории не найден.</p>'; return; }

    const rows = parseHistory(histMd);
    const stats = monthlyStats(rows);
    const top10 = topByCtr(rows, 10);
    const allCtrs = rows.filter(r => r.ctr !== null).map(r => r.ctr);
    const medAll = allCtrs.length
      ? [...allCtrs].sort((a, b) => a - b)[Math.floor(allCtrs.length / 2)]
      : null;
    const best = top10[0];

    el.innerHTML = `
      ${pageHeader('Аналитика', 'Цифры по всем рассылкам и полная история')}
      <div class="stat-summary">
        <div class="stat-card">
          <div class="label">Всего рассылок</div>
          <div class="value">${rows.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Медианный CTR</div>
          <div class="value">${medAll !== null ? medAll.toFixed(1) + '%' : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="label">Лучший CTR</div>
          <div class="value">${best ? best.ctr.toFixed(1) + '%' : '—'}</div>
          ${best ? `<div class="label" style="margin-top:4px">${esc(best.title)}</div>` : ''}
        </div>
      </div>

      <div class="chart-wrap">
        <h3 class="section-title">Средний CTR по месяцам</h3>
        <canvas id="ctr-chart" height="100"></canvas>
      </div>

      <h3 class="section-title" style="margin:20px 0 10px">Топ-10 по CTR</h3>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>CTR</th>
              <th>Заголовок</th>
              <th>Текст</th>
              <th>Доставлено</th>
              <th>Месяц</th>
            </tr>
          </thead>
          <tbody>
            ${top10.map(r => `
              <tr>
                <td class="${ctrClass(r.ctr)}" style="white-space:nowrap">${r.ctr.toFixed(1)}%</td>
                <td>${esc(r.title)}</td>
                <td>${esc(r.text)}</td>
                <td style="white-space:nowrap">${r.delivered !== null ? r.delivered.toLocaleString('ru-RU') : '—'}</td>
                <td style="white-space:nowrap">${esc(r.month)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      ${analyticsMd ? `
        <h3 class="section-title" style="margin:28px 0 10px">Выводы из базы</h3>
        <div class="md">${marked.parse(analyticsMd)}</div>
      ` : ''}

      <section style="margin-top:36px">
        <h3 class="section-title">История рассылок</h3>
        <div class="table-toolbar">
          <input id="hist-search" class="hist-filter" placeholder="Поиск по заголовку, тексту или месяцу…">
          <span class="count" id="hist-count">${rows.length} из ${rows.length}</span>
        </div>
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
            <tbody>${rows.map(histRowHtml).join('')}</tbody>
          </table>
        </div>
      </section>`;

    let sortKey = null, sortDir = 1;

    function filtered(query) {
      if (!query) return rows;
      const q = query.toLowerCase();
      return rows.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.text || '').toLowerCase().includes(q) ||
        (r.month || '').toLowerCase().includes(q)
      );
    }

    function sorted(list) {
      if (!sortKey) return list;
      return [...list].sort((a, b) => {
        const av = a[sortKey] ?? -Infinity, bv = b[sortKey] ?? -Infinity;
        return (av - bv) * sortDir;
      });
    }

    function renderHist() {
      const q = el.querySelector('#hist-search')?.value ?? '';
      const tbody = el.querySelector('.hist-table table tbody');
      if (!tbody) return;
      const list = sorted(filtered(q));
      tbody.innerHTML = list.map(histRowHtml).join('');
      const count = el.querySelector('#hist-count');
      if (count) count.textContent = `${list.length} из ${rows.length}`;
    }

    el.querySelector('#hist-search')?.addEventListener('input', renderHist);

    el.querySelector('.hist-table')?.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (sortKey === key) { sortDir *= -1; }
      else { sortKey = key; sortDir = -1; }
      renderHist();
    });

    if (stats.length) {
      new Chart(el.querySelector('#ctr-chart'), {
        type: 'bar',
        data: {
          labels: stats.map(s => s.month),
          datasets: [{
            label: 'Средний CTR, %',
            data: stats.map(s => +s.avgCtr.toFixed(2)),
            backgroundColor: 'rgba(37,99,235,0.7)',
            borderRadius: 4,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } },
        },
      });
    }
  },
});

import { registerView } from '../app.js';
import { parseHistory, monthlyStats, topByCtr } from '../lib/history.js';

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
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
        <h3 style="font-size:.95rem;font-weight:600;margin-bottom:14px">Средний CTR по месяцам</h3>
        <canvas id="ctr-chart" height="100"></canvas>
      </div>

      <h3 style="font-size:.95rem;font-weight:600;margin:20px 0 10px">Топ-10 по CTR</h3>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;font-size:.85rem;width:100%">
          <thead>
            <tr>
              <th style="border:1px solid var(--border);padding:6px 10px;background:var(--bg)">CTR</th>
              <th style="border:1px solid var(--border);padding:6px 10px;background:var(--bg)">Заголовок</th>
              <th style="border:1px solid var(--border);padding:6px 10px;background:var(--bg)">Текст</th>
              <th style="border:1px solid var(--border);padding:6px 10px;background:var(--bg)">Доставлено</th>
              <th style="border:1px solid var(--border);padding:6px 10px;background:var(--bg)">Месяц</th>
            </tr>
          </thead>
          <tbody>
            ${top10.map(r => `
              <tr>
                <td style="border:1px solid var(--border);padding:6px 10px;font-weight:600">${r.ctr.toFixed(1)}%</td>
                <td style="border:1px solid var(--border);padding:6px 10px">${esc(r.title)}</td>
                <td style="border:1px solid var(--border);padding:6px 10px">${esc(r.text)}</td>
                <td style="border:1px solid var(--border);padding:6px 10px">${r.delivered !== null ? r.delivered.toLocaleString('ru-RU') : '—'}</td>
                <td style="border:1px solid var(--border);padding:6px 10px">${esc(r.month)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      ${analyticsMd ? `
        <h3 style="font-size:.95rem;font-weight:600;margin:28px 0 10px">Выводы из базы</h3>
        <div class="md">${marked.parse(analyticsMd)}</div>
      ` : ''}`;

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

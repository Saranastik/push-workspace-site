import { registerView } from '../registry.js';
import { parseHistory, monthlyStats, topByCtr } from '../lib/history.js';
import { pageHeader, esc, ctrClass } from '../ui.js';

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
      ${pageHeader('Аналитика', 'Цифры по всем рассылкам из базы')}
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

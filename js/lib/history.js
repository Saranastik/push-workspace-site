export function parseHistory(md) {
  const rows = [];
  let month = null;
  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+(.+)/);
    if (h) { month = h[1].trim(); continue; }
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 5 || cells[0] === 'Дата' || /^:?-{2,}:?$/.test(cells[0])) continue;
    const num = (s) => { const n = parseInt(s.replace(/[\s ]/g, ''), 10); return Number.isFinite(n) ? n : null; };
    const pct = (s) => { const n = parseFloat(s.replace(',', '.').replace('%', '')); return Number.isFinite(n) ? n : null; };
    rows.push({ month, date: cells[0], title: cells[1], text: cells[2], delivered: num(cells[3]), ctr: pct(cells[4]) });
  }
  return rows;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function monthlyStats(rows) {
  const order = [], byMonth = new Map();
  for (const r of rows) {
    if (r.ctr === null) continue;
    if (!byMonth.has(r.month)) { byMonth.set(r.month, []); order.push(r.month); }
    byMonth.get(r.month).push(r.ctr);
  }
  return order.map(m => {
    const c = byMonth.get(m);
    return { month: m, count: c.length, avgCtr: c.reduce((a, b) => a + b, 0) / c.length, medianCtr: median(c) };
  });
}

export const topByCtr = (rows, n) =>
  [...rows].filter(r => r.ctr !== null).sort((a, b) => b.ctr - a.ctr).slice(0, n);

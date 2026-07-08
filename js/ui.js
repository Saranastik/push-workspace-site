// Мелкие переиспользуемые UI-компоненты (только разметка, без логики данных).

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function pageHeader(title, subtitle = '') {
  return `
    <header class="page-header">
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
    </header>`;
}

export function emptyState(text, hint = '') {
  return `
    <div class="empty-state">
      <p>${esc(text)}</p>
      ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
    </div>`;
}

export function badge(text, kind = 'muted') {
  return `<span class="badge badge-${esc(kind)}">${esc(text)}</span>`;
}

// Класс для окраски CTR в таблицах: сильный / слабый / обычный.
export function ctrClass(ctr) {
  if (ctr === null || ctr === undefined) return '';
  return ctr >= 2.5 ? 'ctr-hi' : ctr < 1.2 ? 'ctr-lo' : '';
}

import { registerView } from '../registry.js';
import { renderResult, renderRawFallback } from './desk.js';
import { validateResult, parseResultJson } from '../lib/inbox.js';
import { pageHeader, emptyState } from '../ui.js';

registerView('archive', {
  async mount(el, gh) {
    el.innerHTML = '<p>Загрузка…</p>';
    const files = (await gh.listDir('results'))
      .filter(f => f.name.endsWith('.json') && f.name !== '.gitkeep')
      .sort((a, b) => b.name.localeCompare(a.name));

    if (!files.length) {
      el.innerHTML = pageHeader('Архив сессий')
        + emptyState('Пока пусто', 'Отправьте первый запрос на «Рабочем столе» — ответ появится здесь.');
      return;
    }

    el.innerHTML = `
      ${pageHeader('Архив сессий', 'Все ответы Claude — выберите запись')}
      <ul class="sessions">
        ${files.map(f => {
          const label = f.name.replace('.json', '').replace(
            /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\d{2}$/,
            '$3.$2.$1 $4:$5'
          );
          return `<li><button data-path="${f.path}">${label}</button></li>`;
        }).join('')}
      </ul>
      <div id="session"></div>`;

    el.addEventListener('click', async (e) => {
      const path = e.target.dataset?.path;
      if (!path) return;
      el.querySelectorAll('.sessions button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const box = el.querySelector('#session');
      box.innerHTML = '<p>Загрузка…</p>';
      const raw = await gh.getRaw(path);
      if (raw === null) { box.innerHTML = '<p class="error">Файл не найден.</p>'; return; }
      const parsed = parseResultJson(raw);
      const status = document.createElement('p');
      if (parsed.ok && validateResult(parsed.value).ok) {
        renderResult(box, parsed.value);
      } else {
        box.innerHTML = '';
        const out = document.createElement('div');
        box.append(status, out);
        renderRawFallback(out, status, raw, parsed.ok ? validateResult(parsed.value).error : parsed.error);
      }
    });
  },
});

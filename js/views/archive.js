import { registerView } from '../registry.js';
import { renderResult } from './desk.js';
import { validateResult } from '../lib/inbox.js';

registerView('archive', {
  async mount(el, gh) {
    el.innerHTML = '<p>Загрузка…</p>';
    const files = (await gh.listDir('results'))
      .filter(f => f.name.endsWith('.json') && f.name !== '.gitkeep')
      .sort((a, b) => b.name.localeCompare(a.name));

    if (!files.length) { el.innerHTML = '<p>Пока пусто.</p>'; return; }

    el.innerHTML = `
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
      const r = await gh.getJson(path);
      if (r && validateResult(r).ok) renderResult(box, r);
      else box.innerHTML = '<p class="error">Файл повреждён или не по формату.</p>';
    });
  },
});

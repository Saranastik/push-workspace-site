import { registerView } from '../registry.js';
import { pageHeader } from '../ui.js';

const DOCS = [
  ['Стайлгайд',       'Пуши/Стайлгайд.md'],
  ['Мои правки',      'Пуши/Мои правки.md'],
  ['Аналитика',       'Пуши/Аналитика.md'],
  ['Лучшие пуши',     'Пуши/Примеры лучших пушей.md'],
  ['Инструкции',      'Пуши/AGENTS.md'],
];

registerView('knowledge', {
  mount(el, gh) {
    el.innerHTML = `
      ${pageHeader('База знаний', 'Стайлгайд, правила и аналитика — то, на что опирается Claude')}
      <nav class="subnav">
        ${DOCS.map(([t], i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}
      </nav>
      <article id="doc" class="md">Загрузка…</article>`;

    const open = async (i) => {
      el.querySelectorAll('.subnav button').forEach((b, j) => b.classList.toggle('active', j === i));
      el.querySelector('#doc').innerHTML = 'Загрузка…';
      const raw = await gh.getRaw(DOCS[i][1]);
      el.querySelector('#doc').innerHTML = raw
        ? marked.parse(raw)
        : '<p class="error">Файл не найден.</p>';
    };

    el.querySelector('.subnav').addEventListener('click', (e) => {
      if (e.target.dataset.i !== undefined) open(+e.target.dataset.i);
    });

    open(0);
  },
});

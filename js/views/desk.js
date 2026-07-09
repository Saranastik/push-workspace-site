import { registerView } from '../registry.js';
import { CONFIG } from '../config.js';
import { ACTIONS, makeRequest, validateResult, parseResultJson, runStateForRequest } from '../lib/inbox.js';
import { pageHeader } from '../ui.js';

export function renderResult(el, r) {
  const esc = (s) => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
  el.innerHTML = `
    <div class="session">
      <h2>${esc(r.title || r.id)}</h2>
      ${r.status === 'error' ? `<p class="error">Ошибка: ${esc(r.error)}</p>` : ''}
      ${r.summary ? `<p class="summary">${esc(r.summary)}</p>` : ''}
      ${(r.items || []).map(it => `
        <div class="card">
          ${it.original ? `<p class="original"><b>Исходный:</b> ${esc(it.original)} <span class="verdict v-${esc(it.verdict)}">${esc(it.verdict)}</span></p>` : ''}
          ${it.comment ? `<p class="comment">${esc(it.comment)}</p>` : ''}
          ${(it.variants || []).map(v => `
            <div class="variant">
              <p><b>${esc(v.title)}</b><br>${esc(v.text)}</p>
              ${v.note ? `<p class="note">${esc(v.note)}</p>` : ''}
              <button class="copy" data-copy="${esc(`${v.title}\n${v.text}`)}">Скопировать</button>
            </div>`).join('')}
        </div>`).join('')}
      ${(r.changes || []).length ? `<p class="changes">Обновлено: ${r.changes.map(c => `${esc(c.file)} — ${esc(c.note)}`).join('; ')}</p>` : ''}
    </div>`;
  el.querySelectorAll('.copy').forEach(b =>
    b.addEventListener('click', () => navigator.clipboard.writeText(b.dataset.copy))
  );
}

export function renderRawFallback(outEl, statusEl, raw, parseError) {
  statusEl.textContent = `Ответ пришёл, но файл повреждён (${parseError}) — показываю как есть.`;
  const pre = document.createElement('pre');
  pre.className = 'raw-fallback';
  pre.textContent = raw;
  outEl.innerHTML = '';
  outEl.appendChild(pre);
}

async function pollResult(gh, id, statusEl, outEl) {
  const started = Date.now();
  while (Date.now() - started < CONFIG.pollTimeoutMs) {
    try {
      const [raw, runs] = await Promise.all([
        gh.getRaw(`results/${id}.json`),
        gh.latestRuns(5).catch(() => []),
      ]);
      if (raw !== null) {
        const parsed = parseResultJson(raw);
        if (!parsed.ok) {
          renderRawFallback(outEl, statusEl, raw, parsed.error);
          return;
        }
        const v = validateResult(parsed.value);
        if (!v.ok) {
          renderRawFallback(outEl, statusEl, raw, v.error);
          return;
        }
        statusEl.textContent = '';
        renderResult(outEl, parsed.value);
        return;
      }
      const { state, run } = runStateForRequest(runs, id);
      if (state === 'working') {
        statusEl.textContent = 'Claude работает…';
      } else if (state === 'failed') {
        statusEl.innerHTML = `Обработка упала — <a href="${run.html_url}" target="_blank">лог запуска</a>`;
        return;
      } else if (state === 'finished') {
        statusEl.textContent = 'Обработка завершена, забираю результат…';
      } else {
        statusEl.textContent = 'Запрос в очереди…';
      }
    } catch (err) {
      if (err.message === 'AUTH') {
        statusEl.textContent = 'Токен перестал работать — перезайдите (кнопка ⎋).';
        return;
      }
      statusEl.textContent = 'Сбой сети — продолжаю проверять…';
    }
    await new Promise(r => setTimeout(r, CONFIG.pollMs));
  }
  statusEl.textContent = 'Не дождались ответа за 10 минут — проверьте вкладку Actions в репозитории.';
}

registerView('desk', {
  mount(el, gh) {
    el.innerHTML = `
      ${pageHeader('Рабочий стол', 'Отправьте запрос — Claude разберёт его за 2–3 минуты')}
      <form id="ask">
        <label class="field">
          <span>Что сделать</span>
          <select name="action">
            ${Object.entries(ACTIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Задание</span>
          <textarea name="text" rows="10" placeholder="Формат пуша: заголовок — первая строка, текст — вторая. Несколько пушей разделяйте ---

Пример:
Только в Селекте
Levi's, Mango и HUGO уже здесь. Смотреть подборку
---
Второй заголовок
Текст второго пуша

Для других действий просто опишите задание своими словами."></textarea>
        </label>
        <label class="field">
          <span>Комментарий (необязательно)</span>
          <input name="comment" placeholder="Уточнение к заданию">
        </label>
        <button type="submit">Отправить</button>
      </form>
      <p id="status"></p>
      <div id="out"></div>`;

    el.querySelector('#ask').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Отправляю…';
      const f = new FormData(e.target);
      const statusEl = el.querySelector('#status');
      const outEl = el.querySelector('#out');
      outEl.innerHTML = '';

      try {
        const runs = await gh.latestRuns(1);
        if (runs[0] && runs[0].status !== 'completed') {
          statusEl.textContent = 'Предыдущий запрос ещё обрабатывается — этот встанет в очередь.';
        }
        const req = makeRequest(f.get('action'), f.get('text'), f.get('comment'));
        await gh.putFile(req.path, JSON.stringify(req.json, null, 2), `request ${req.id} (${req.json.action})`);
        statusEl.textContent = 'Отправлено. Обычно ответ занимает 2–3 минуты.';
        pollResult(gh, req.id, statusEl, outEl);
      } catch (err) {
        statusEl.textContent = err.message === 'AUTH'
          ? 'Токен перестал работать — перезайдите (кнопка ⎋).'
          : `Ошибка: ${err.message}`;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Отправить';
      }
    });
  },
});

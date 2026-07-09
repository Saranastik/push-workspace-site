export const ACTIONS = {
  analyze:     'Проанализировать и улучшить',
  generate:    'Написать пуши',
  update_plan: 'Обновить промоплан',
  add_history: 'Добавить в историю',
  custom:      'Произвольный запрос',
};

export function makeRequest(action, text, comment = '', now = new Date()) {
  if (!ACTIONS[action]) throw new Error(`Неизвестное действие: ${action}`);
  if (!text || !text.trim()) throw new Error('Пустой текст запроса');
  const p = (n, l = 2) => String(n).padStart(l, '0');
  const id = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return {
    id,
    path: `inbox/${id}.json`,
    json: { id, action, text: text.trim(), comment: comment.trim(), created_at: now.toISOString() },
  };
}

export function parseResultJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Статус обработки конкретного запроса: ищем запуск по id в заголовке
// коммита («request <id> (…)»), чтобы чужие провалы не прерывали ожидание.
export function runStateForRequest(runs, id) {
  const run = (runs || []).find(r => (r.display_title || '').includes(id));
  if (!run) return { state: 'queued', run: null };
  if (run.status !== 'completed') return { state: 'working', run };
  if (run.conclusion === 'failure') return { state: 'failed', run };
  return { state: 'finished', run };
}

const STATUSES = ['ok', 'error'];

export function validateResult(o) {
  if (!o || typeof o !== 'object') return { ok: false, error: 'не объект' };
  for (const f of ['id', 'action', 'status']) {
    if (typeof o[f] !== 'string') return { ok: false, error: `нет поля ${f}` };
  }
  if (!STATUSES.includes(o.status)) return { ok: false, error: `status: ${o.status}` };
  if (o.items && !Array.isArray(o.items)) return { ok: false, error: 'items не массив' };
  return { ok: true };
}

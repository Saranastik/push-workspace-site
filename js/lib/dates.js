// Разбор дат из промоплана: «2 июля», «06.07» → Date; статус дня относительно сегодня.

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function parseRuDay(str, ref = new Date()) {
  const s = String(str ?? '').trim().toLowerCase();
  let m = /^(\d{1,2})\s+([а-яё]+)/.exec(s);
  if (m) {
    const mi = MONTHS.indexOf(m[2]);
    if (mi >= 0) return new Date(ref.getFullYear(), mi, +m[1]);
    return null;
  }
  m = /^(\d{1,2})\.(\d{1,2})\b/.exec(s);
  if (m) return new Date(ref.getFullYear(), +m[2] - 1, +m[1]);
  return null;
}

export function dayStatus(d, now = new Date()) {
  if (!d || isNaN(d)) return null;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (a === b) return 'today';
  return a < b ? 'past' : 'upcoming';
}

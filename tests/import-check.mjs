// Смоук-проверка: все модули сайта импортируются без ошибок.
const modules = [
  'registry', 'config', 'ui',
  'lib/inbox', 'lib/history', 'lib/dates',
  'views/desk', 'views/archive', 'views/knowledge', 'views/plan', 'views/analytics',
];

let failed = false;
for (const m of modules) {
  try {
    await import(`../js/${m}.js`);
    console.log('OK  ', m);
  } catch (e) {
    console.log('FAIL', m, '—', e.message);
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;

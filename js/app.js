import { CONFIG } from './config.js';
import { GH } from './github.js';

const views = {};
export function registerView(id, view) { views[id] = view; }

import './views/desk.js';
import './views/archive.js';
import './views/knowledge.js';
import './views/plan.js';
import './views/analytics.js';

const $ = (s) => document.querySelector(s);
let gh = null;

async function tokenOk(token) {
  try { return (await new GH(token, CONFIG.owner, CONFIG.repo, CONFIG.branch).getRaw('CLAUDE.md')) !== null; }
  catch { return false; }
}

function show(tab) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#view').innerHTML = '';
  views[tab].mount($('#view'), gh);
}

async function boot() {
  const token = localStorage.getItem('gh_pat');
  if (token && await tokenOk(token)) {
    gh = new GH(token, CONFIG.owner, CONFIG.repo, CONFIG.branch);
    $('#gate').classList.add('hidden');
    $('#shell').classList.remove('hidden');
    show('desk');
  } else {
    localStorage.removeItem('gh_pat');
    $('#shell').classList.add('hidden');
    $('#gate').classList.remove('hidden');
  }
}

$('#gate-save').addEventListener('click', async () => {
  const t = $('#gate-token').value.trim();
  $('#gate-error').classList.add('hidden');
  if (await tokenOk(t)) {
    localStorage.setItem('gh_pat', t);
    boot();
  } else {
    $('#gate-error').textContent = 'Токен не подошёл: проверьте права (Contents: Read and write) и репозиторий.';
    $('#gate-error').classList.remove('hidden');
  }
});

$('#logout').addEventListener('click', () => { localStorage.removeItem('gh_pat'); boot(); });
document.addEventListener('click', (e) => { if (e.target.matches('#tabs button')) show(e.target.dataset.tab); });
boot();

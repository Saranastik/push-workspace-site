import { registerView } from '../app.js';

registerView('analytics', {
  mount(el) { el.textContent = 'Аналитика — скоро'; },
});

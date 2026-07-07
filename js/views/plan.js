import { registerView } from '../app.js';

registerView('plan', {
  mount(el) { el.textContent = 'Промоплан и история — скоро'; },
});

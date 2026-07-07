import { registerView } from '../app.js';

registerView('archive', {
  mount(el) { el.textContent = 'Архив — скоро'; },
});

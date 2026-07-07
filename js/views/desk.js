import { registerView } from '../app.js';

registerView('desk', {
  mount(el) { el.textContent = 'Рабочий стол — скоро'; },
});

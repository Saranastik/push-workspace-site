import { registerView } from '../app.js';

registerView('knowledge', {
  mount(el) { el.textContent = 'База знаний — скоро'; },
});

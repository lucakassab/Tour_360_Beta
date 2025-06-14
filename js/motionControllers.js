console.log('[MC] motionControllers.js carregado');

AFRAME.registerComponent('motion-controls-box', {
  schema: { hand: { type: 'string', default: 'left' } },
  init() {
    console.log(`[MC] Registrando controles para mão: ${this.data.hand}`);
    const box = document.createElement('a-box');
    box.setAttribute('depth', 0.1);
    box.setAttribute('height', 0.1);
    box.setAttribute('width', 0.1);
    box.setAttribute('color', '#FFF');
    this.el.appendChild(box);

    this.el.addEventListener('triggerdown', () => {
      console.log(`[MC] triggerdown [${this.data.hand}]`);
      box.setAttribute('color', 'red');
    });
    this.el.addEventListener('triggerup', () => {
      console.log(`[MC] triggerup [${this.data.hand}]`);
      box.setAttribute('color', '#FFF');
    });
    this.el.addEventListener('axismove', evt => {
      console.log(`[MC] axismove [${this.data.hand}]:`, evt.detail.axis);
    });
  }
});

window.addEventListener('load', () => {
  console.log('[MC] Adicionando entidades de controle na cena');
  const scene = document.querySelector('a-scene');
  if (!scene) {
    console.error('[MC] a-scene não encontrada');
    return;
  }
  ['left','right'].forEach(hand => {
    const ctrl = document.createElement('a-entity');
    ctrl.setAttribute('hand-controls', `hand: ${hand}`);
    ctrl.setAttribute('motion-controls-box', `hand: ${hand}`);
    scene.appendChild(ctrl);
  });
});

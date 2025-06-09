AFRAME.registerComponent('motion-controls-box', {
  schema: { hand: { type: 'string', default: 'left' } },
  init() {
    const box = document.createElement('a-box');
    box.setAttribute('depth', 0.1);
    box.setAttribute('height', 0.1);
    box.setAttribute('width', 0.1);
    box.setAttribute('color', '#FFF');
    this.el.appendChild(box);

    this.el.addEventListener('triggerdown', () => box.setAttribute('color', 'red'));
    this.el.addEventListener('triggerup',   () => box.setAttribute('color', '#FFF'));
    this.el.addEventListener('axismove', evt => {
      console.log(`Joystick [${this.data.hand}]:`, evt.detail.axis);
    });
  }
});

window.addEventListener('load', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  ['left','right'].forEach(hand => {
    const ctrl = document.createElement('a-entity');
    ctrl.setAttribute('hand-controls', `hand: ${hand}`);
    ctrl.setAttribute('motion-controls-box', `hand: ${hand}`);
    scene.appendChild(ctrl);
  });
});

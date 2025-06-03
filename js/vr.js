// vr.js

import { VRButton } from './js/VRButton.js'; // caminho RELATIVO ao js/vr.js

import {
  THREE,
  scene,
  camera,
  renderer,
  loadMediaInSphere,
  showButtonHUD,
  updateHUDPositions,
  lastMediaURL,
  lastMediaStereo
} from './core.js';

export let onEnterXR = null;
const LABEL = { 4: 'A', 5: 'B' };

// Debounce para rotação (eixo analógico)
let canLeft  = true;
let canRight = true;

// Estado anterior dos botões A (4) e B (5)
let prevPrevPressed = false;
let prevNextPressed = false;

// Função para trocar de mídia
function change(delta) {
  const sel = document.getElementById('mediaSelect');
  if (!sel || !sel.options.length) return;
  let i = (parseInt(sel.value) + delta + sel.options.length) % sel.options.length;
  sel.value = i;
  loadMediaInSphere(
    sel.options[i].dataset.url,
    sel.options[i].dataset.stereo === 'true'
  );
}

// Função para rotacionar a cena
function rotate(deg) {
  scene.rotation.y += THREE.MathUtils.degToRad(deg);
}

export function initialize() {
  // Se já estiver habilitado, sai
  if (renderer.xr.enabled) return;

  // Ativa WebXR no renderer
  renderer.xr.enabled = true;

  // Cria e adiciona o botão “ENTER VR” na página
  const btn = VRButton.createButton(renderer);
  document.body.appendChild(btn);

  // Quando começar a sessão XR
  renderer.xr.addEventListener('sessionstart', () => {
    // Se o loader.js registrar callback onEnterXR, chama
    onEnterXR?.();
    // Recarrega a última mídia (se já havia sido carregada)
    if (lastMediaURL) {
      loadMediaInSphere(lastMediaURL, lastMediaStereo);
    }
    // Inicia o loop de renderização dentro do VR
    renderer.setAnimationLoop(loop);
  });
}

// Loop de VR para controles de gamepad
function loop() {
  const session = renderer.xr.getSession();
  if (session) {
    let anyPrevPressed = false;
    let anyNextPressed = false;

    session.inputSources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;
      if (gp.buttons[4]?.pressed) anyPrevPressed = true; // botão A
      if (gp.buttons[5]?.pressed) anyNextPressed = true; // botão B
    });

    // Edge detection: só dispara troca quando muda de “solto” → “pressionado”
    if (anyPrevPressed && !prevPrevPressed) {
      showButtonHUD(LABEL[4]);
      change(-1);
    }
    if (anyNextPressed && !prevNextPressed) {
      showButtonHUD(LABEL[5]);
      change(+1);
    }
    prevPrevPressed = anyPrevPressed;
    prevNextPressed = anyNextPressed;

    // Rotação via eixo analógico
    session.inputSources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;
      // Alguns controles usam gp.axes[2], outros usam [0]
      const ax = gp.axes[2] ?? gp.axes[0];
      if (ax > 0.5 && canRight) {
        rotate(-20);
        canRight = false;
      }
      if (ax < -0.5 && canLeft) {
        rotate(20);
        canLeft = false;
      }
      if (Math.abs(ax) <= 0.5) {
        canLeft = canRight = true;
      }
    });
  }

  updateHUDPositions();
  renderer.render(scene, camera);
}

// Função que o loader/desktop/mobile chamam para exibir mídia em VR ou não
export const loadMediainVR = (url, stereo) => {
  camera.layers.enable(stereo ? 1 : 0);
  camera.layers.enable(stereo ? 2 : 0);
  camera.layers.disable(stereo ? 0 : 1);
  camera.layers.disable(stereo ? 0 : 2);
  loadMediaInSphere(url, stereo);
};

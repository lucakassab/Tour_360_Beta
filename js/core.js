// carrega um script e retorna Promise
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(`Erro ao carregar ${src}`);
    document.head.appendChild(s);
  });
}

async function init() {
  // registra SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(err => console.warn('SW falhou:', err));
  }

  const isPWA       = window.matchMedia('(display-mode: standalone)').matches;
  const isOffline   = !navigator.onLine;
  const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  const appDiv      = document.getElementById('app');

  // caminhos das imagens
  const IMG_MONO   = './media/img_02_mono.jpg';
  const IMG_STEREO = './media/img_01_stereo.jpg';

  // imagem inicial (mono sempre)
  let currentSrc = IMG_MONO;

  // monta a-scene
  const scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

  // assets
  const assets = document.createElement('a-assets');
  const imgEl  = document.createElement('img');
  imgEl.id     = 'skyTex';
  imgEl.src    = currentSrc;
  assets.appendChild(imgEl);
  scene.appendChild(assets);

  // sky
  const sky = document.createElement('a-sky');
  sky.setAttribute('src', '#skyTex');
  scene.appendChild(sky);

  appDiv.appendChild(scene);

  // ao entrar em VR troca pra estéreo e carrega controles
  scene.addEventListener('enter-vr', async () => {
    imgEl.src = IMG_STEREO;
    sky.setAttribute('stereo', '');
    try {
      await loadScript('js/motionControllers.js');
    } catch (e) {
      console.warn(e);
    }
  });
}

// carrega A-Frame → plugin estéreo → init
loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error(err));

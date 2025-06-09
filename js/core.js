// carrega scripts dinamicamente
async function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(`Falha ao carregar ${src}`);
    document.head.appendChild(s);
  });
}

async function init() {
  try {
    // register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('js/sw.js')
        .catch(err => console.warn('SW registration falhou:', err));
    }

    // detecta PWA / offline / WebXR
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isOffline = !navigator.onLine;
    const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
    const appDiv = document.getElementById('app');

    // decide imagem inicial (modo VR só após enter-vr)
    const inicialMono = true;
    const imgSrc = inicialMono ? 'media/img_02_mono.jpg' : 'media/img_01_stereo.jpg';

    // cria cena A-Frame
    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

    // assets
    const assets = document.createElement('a-assets');
    const img = document.createElement('img');
    img.id = 'skyTex';
    img.src = imgSrc;
    assets.appendChild(img);
    scene.appendChild(assets);

    // sky
    const sky = document.createElement('a-sky');
    sky.setAttribute('src', '#skyTex');
    if (!inicialMono && xrSupported) {
      sky.setAttribute('stereo', '');
    }
    scene.appendChild(sky);

    appDiv.appendChild(scene);

    // quando entrar em VR, troca pra estéreo e carrega controls
    scene.addEventListener('enter-vr', async () => {
      sky.setAttribute('src', 'media/img_01_stereo.jpg');
      sky.setAttribute('stereo', '');
      try {
        await loadScript('js/motionControllers.js');
      } catch(e) {
        console.warn(e);
      }
    });

  } catch (e) {
    console.error('Init falhou merda:', e);
  }
}

// carrega A-Frame + plugin e depois init
Promise.all([
  loadScript('js/aframe.min.js'),
  loadScript('js/aframe-stereo-component.min.js')
]).then(init).catch(err => console.error(err));

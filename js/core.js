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

// busca lista de mídias online (GitHub API) ou offline (cache)
async function getMediaList() {
  if (navigator.onLine) {
    const res = await fetch('https://api.github.com/repos/lucakassab/Tour_360_Beta/contents/media');
    const data = await res.json();
    return data.map(item => item.path); // ex: "media/img_02_mono.jpg"
  } else {
    const cache = await caches.open('tour360-v2');
    const requests = await cache.keys();
    return requests
      .map(req => new URL(req.url).pathname.slice(1))
      .filter(path => path.startsWith('media/'));
  }
}

async function init() {
  // registra SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch(err => console.warn('SW falhou:', err));
  }

  const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  const appDiv      = document.getElementById('app');

  // pega lista dinâmica de mídia
  const mediaList = await getMediaList();
  const monoList   = mediaList.filter(p => p.includes('_mono'));
  const stereoList = mediaList.filter(p => p.includes('_stereo'));
  if (!monoList.length || !stereoList.length) {
    console.error('Sem médias mono ou estéreo disponíveis:', mediaList);
    return;
  }

  let currentSrc = monoList[0]; // carrega primeiro mono disponível

  // monta a cena A-Frame
  const scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

  const assets = document.createElement('a-assets');
  const imgEl  = document.createElement('img');
  imgEl.id     = 'skyTex';
  imgEl.src    = currentSrc;
  assets.appendChild(imgEl);
  scene.appendChild(assets);

  const sky = document.createElement('a-sky');
  sky.setAttribute('src', '#skyTex');
  scene.appendChild(sky);

  appDiv.appendChild(scene);

  // ao entrar em VR, troca pra estéreo e carrega controles
  scene.addEventListener('enter-vr', async () => {
    currentSrc = stereoList[0];
    imgEl.src = currentSrc;
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

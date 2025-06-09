console.log('[CORE] Início do core.js');

function loadScript(src) {
  console.log(`[CORE] Carregando script: ${src}`);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      console.log(`[CORE] Script carregado: ${src}`);
      res();
    };
    s.onerror = e => {
      console.error(`[CORE] Erro ao carregar script: ${src}`, e);
      rej(e);
    };
    document.head.appendChild(s);
  });
}

async function getMediaList() {
  console.log('[CORE] getMediaList()');
  if (navigator.onLine) {
    console.log('[CORE] Online: buscando lista no GitHub');
    const res = await fetch(
      'https://api.github.com/repos/lucakassab/Tour_360_Beta/contents/media'
    );
    if (!res.ok) {
      console.error('[CORE] GitHub API retornou erro:', res.status);
      throw 'GitHub API falhou';
    }
    const data = await res.json();
    const paths = data.map(item => './media/' + item.name);
    console.log('[CORE] Lista GitHub:', paths);
    return paths;
  } else {
    console.log('[CORE] Offline: listando do cache');
    const cache = await caches.open('tour360-v3');
    const requests = await cache.keys();
    const paths = requests
      .map(r => new URL(r.url).pathname)
      .filter(p => p.includes('/media/'))
      .map(p => '.' + p);
    console.log('[CORE] Lista cache:', paths);
    return paths;
  }
}

let monoList = [], stereoList = [];
let xrSupported = false;

function filterLists(mediaList) {
  monoList   = mediaList.filter(p => p.toLowerCase().includes('mono.'));
  stereoList = mediaList.filter(p => p.toLowerCase().includes('stereo.'));
  console.log('[CORE] monoList:', monoList);
  console.log('[CORE] stereoList:', stereoList);
}

function populateDropdown(mediaList) {
  const sel = document.getElementById('mediaSelector');
  sel.innerHTML = '';
  mediaList.forEach(path => {
    const opt = document.createElement('option');
    opt.value = path;
    opt.text  = path.split('/').pop();
    sel.appendChild(opt);
  });
}

function buildScene(src) {
  const isVideo = /\.(mp4|webm)$/i.test(src);
  console.log(`[CORE] buildScene -> src: ${src} | isVideo: ${isVideo}`);
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  const scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled:true');

  const assets = document.createElement('a-assets');
  let assetEl, skyEl;

  if (isVideo) {
    console.log('[CORE] Criando videoSphere');
    assetEl = document.createElement('video');
    assetEl.setAttribute('id', 'skyVid');
    assetEl.setAttribute('loop', '');
    assetEl.setAttribute('autoplay', '');
    assetEl.setAttribute('crossorigin', 'anonymous');
    skyEl = document.createElement('a-videosphere');
  } else {
    console.log('[CORE] Criando sky');
    assetEl = document.createElement('img');
    assetEl.setAttribute('id', 'skyTex');
    skyEl = document.createElement('a-sky');
  }

  assetEl.src = src;
  assetEl.addEventListener('error', e => console.error('[CORE] Erro asset:', e));
  assetEl.addEventListener('load', () => console.log('[CORE] Asset carregado:', src));

  assets.appendChild(assetEl);
  scene.appendChild(assets);
  skyEl.setAttribute('src', isVideo ? '#skyVid' : '#skyTex');
  scene.appendChild(skyEl);
  appDiv.appendChild(scene);

  scene.addEventListener('enter-vr', async () => {
    console.log('[CORE] enter-vr');
    const stereoSrc = stereoList[0];
    const stereoIsVideo = /\.(mp4|webm)$/i.test(stereoSrc);
    console.log('[CORE] stereoIsVideo?', stereoIsVideo);
    assetEl.src = stereoSrc;
    if (!isVideo && stereoIsVideo) {
      console.log('[CORE] Rebuild para vídeo estéreo');
      buildScene(stereoSrc);
    } else {
      console.log('[CORE] Adicionando componente estéreo');
      skyEl.setAttribute('stereo', '');
    }
    try {
      await loadScript('js/motionControllers.js');
    } catch (e) {
      console.warn('[CORE] motionControllers falhou', e);
    }
  });
}

async function init() {
  console.log('[CORE] init()');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(() => console.log('[CORE] SW registrado'))
      .catch(e => console.warn('[CORE] SW falhou', e));
  }

  xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  console.log('[CORE] XR suportado?', xrSupported);

  let mediaList;
  try {
    mediaList = await getMediaList();
  } catch (e) {
    console.error('[CORE] getMediaList falhou', e);
    return;
  }

  filterLists(mediaList);
  if (!monoList.length || !stereoList.length) {
    console.error('[CORE] Sem mídias mono ou estéreo');
    return;
  }

  populateDropdown(mediaList);

  const sel = document.getElementById('mediaSelector');
  sel.addEventListener('change', e => {
    console.log('[CORE] mediaSelector change:', e.target.value);
    buildScene(e.target.value);
  });

  // carrega o primeiro mono por padrão
  sel.value = monoList[0];
  buildScene(monoList[0]);
}

loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error('[CORE] Erro inicial:', err));

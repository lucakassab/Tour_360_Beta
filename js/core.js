console.log('[CORE] Início do core.js');

function loadScript(src) {
  console.log(`[CORE] Carregando script: ${src}`);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { console.log(`[CORE] Script carregado: ${src}`); res(); };
    s.onerror = e => { console.error(`[CORE] Erro ao carregar script: ${src}`, e); rej(e); };
    document.head.appendChild(s);
  });
}

async function getMediaList() {
  console.log('[CORE] getMediaList()');
  if (navigator.onLine) {
    console.log('[CORE] Online: buscando lista no GitHub');
    const res = await fetch('https://api.github.com/repos/lucakassab/Tour_360_Beta/contents/media');
    if (!res.ok) throw `[CORE] GitHub API falhou: ${res.status}`;
    const data = await res.json();
    return data.map(item => './media/' + item.name);
  } else {
    console.log('[CORE] Offline: listando do cache');
    const cache     = await caches.open('tour360-v3');
    const requests  = await cache.keys();
    return requests
      .map(r => '.' + new URL(r.url).pathname)
      .filter(p => p.includes('/media/'));
  }
}

let monoList = [], stereoList = [], xrSupported = false;

function filterLists(list) {
  monoList   = list.filter(p => p.toLowerCase().includes('mono.'));
  stereoList = list.filter(p => p.toLowerCase().includes('stereo.'));
  console.log('[CORE] monoList:', monoList);
  console.log('[CORE] stereoList:', stereoList);
}

function populateDropdown(list) {
  const sel = document.getElementById('mediaSelector');
  sel.innerHTML = '';
  list.forEach(p => {
    const o = document.createElement('option');
    o.value = p;
    o.text  = p.split('/').pop();
    sel.appendChild(o);
  });
}

function buildScene(src) {
  const isVideo = /\.(mp4|webm)$/i.test(src);
  console.log(`[CORE] buildScene → ${src} | video? ${isVideo}`);
  const app = document.getElementById('app');
  app.innerHTML = '';

  const scene  = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

  const assets = document.createElement('a-assets');
  let asset, sky;

  if (isVideo) {
    asset = document.createElement('video');
    asset.id = 'skyVid';
    asset.muted = true;
    asset.loop  = true;
    asset.preload = 'auto';
    asset.playsInline = true;
    asset.setAttribute('crossorigin', 'anonymous');
    sky = document.createElement('a-videosphere');
    sky.setAttribute('src', '#skyVid');

    asset.addEventListener('canplaythrough', () => {
      console.log('[CORE] Vídeo pronto – play()');
      asset.play().catch(e => console.warn('[CORE] autoplay bloqueado', e));
    });
  } else {
    asset = document.createElement('img');
    asset.id = 'skyTex';
    asset.setAttribute('crossorigin', 'anonymous');
    sky = document.createElement('a-sky');

    asset.addEventListener('load', () => {
      console.log('[CORE] Imagem carregada:', src);
      sky.setAttribute('material', 'src:#skyTex');
    });
  }

  asset.src = src;
  asset.addEventListener('error', e => console.error('[CORE] Falha asset:', e));

  assets.appendChild(asset);
  scene.appendChild(assets);
  if (!isVideo) sky.setAttribute('src', '#skyTex');
  scene.appendChild(sky);
  app.appendChild(scene);

  scene.addEventListener('enter-vr', async () => {
    console.log('[CORE] enter-vr');
    const stereoSrc = stereoList[0];
    if (!stereoSrc) return;

    const stereoIsVid = /\.(mp4|webm)$/i.test(stereoSrc);
    console.log('[CORE] Stereo vídeo?', stereoIsVid);
    asset.src = stereoSrc;

    if (!isVideo && stereoIsVid) buildScene(stereoSrc);
    else sky.setAttribute('stereo', '');

    try { await loadScript('js/motionControllers.js'); }
    catch (e) { console.warn('[CORE] motionControllers falhou', e); }
  });
}

async function init() {
  console.log('[CORE] init()');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(() => console.log('[CORE] SW registrado'))
      .catch(e  => console.warn('[CORE] SW falhou', e));
  }

  xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  console.log('[CORE] XR suportado?', xrSupported);

  let list;
  try { list = await getMediaList(); }
  catch (e) { console.error('[CORE] getMediaList falhou', e); return; }

  filterLists(list);
  if (!monoList.length || !stereoList.length) {
    console.error('[CORE] Sem mídias mono ou estéreo'); return;
  }

  populateDropdown(list);

  const sel = document.getElementById('mediaSelector');
  sel.addEventListener('change', e => buildScene(e.target.value));

  sel.value = monoList[0];
  buildScene(monoList[0]);
}

loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error('[CORE] Erro inicial:', err));

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
    const list = data.map(item => './media/' + item.name);
    console.log('[CORE] Lista GitHub:', list);
    return list;
  } else {
    console.log('[CORE] Offline: listando no cache');
    const cache = await caches.open('tour360-v3');
    const keys  = await cache.keys();
    const list = keys
      .map(r => '.' + new URL(r.url).pathname)
      .filter(p => p.includes('/media/'));
    console.log('[CORE] Lista cache:', list);
    return list;
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
    const opt = document.createElement('option');
    opt.value = p;
    opt.text  = p.split('/').pop();
    sel.appendChild(opt);
  });
}

function buildScene(src) {
  const isVideo = /\.(mp4|webm)$/i.test(src);
  console.log(`[CORE] buildScene → src: ${src} | isVideo: ${isVideo}`);
  const app = document.getElementById('app');
  app.innerHTML = `
    <a-scene embedded ${xrSupported ? 'vr-mode-ui="enabled:true"' : ''}>
      <a-assets>
        ${isVideo
          ? `<video id="skyVid" src="${src}" autoplay loop muted playsinline crossorigin="anonymous"></video>`
          : `<img id="skyTex" src="${src}" crossorigin="anonymous">`}
      </a-assets>
      ${isVideo
          ? `<a-videosphere src="#skyVid"></a-videosphere>`
          : `<a-sky src="#skyTex"></a-sky>`}
    </a-scene>
  `;
  const scene = document.querySelector('a-scene');
  scene.addEventListener('loaded', () => console.log('[CORE] cena carregada'));
  scene.addEventListener('enter-vr', () => {
    console.log('[CORE] enter-vr');
    const stereoSrc = stereoList[0];
    if (!stereoSrc) return;
    console.log('[CORE] carregando estéreo:', stereoSrc);
    if (/\.(mp4|webm)$/i.test(stereoSrc)) {
      buildScene(stereoSrc);
    } else {
      const imgEl = document.querySelector('#skyTex');
      if (imgEl) imgEl.src = stereoSrc;
      const skyEl = document.querySelector('a-sky');
      if (skyEl) skyEl.setAttribute('stereo', '');
    }
    loadScript('js/motionControllers.js')
      .catch(e => console.warn('[CORE] motionControllers falhou', e));
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
  try { mediaList = await getMediaList(); }
  catch (e) { console.error('[CORE] getMediaList falhou', e); return; }

  filterLists(mediaList);
  if (!monoList.length || !stereoList.length) {
    console.error('[CORE] Sem mídias mono ou estéreo'); return;
  }

  populateDropdown(mediaList);
  const sel = document.getElementById('mediaSelector');
  sel.addEventListener('change', e => buildScene(e.target.value));
  sel.value = monoList[0];
  buildScene(monoList[0]);
}

loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error('[CORE] Erro inicial:', err));

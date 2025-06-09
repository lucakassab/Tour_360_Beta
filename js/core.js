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
    s.onerror = (e) => {
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
    const res = await fetch('https://api.github.com/repos/lucakassab/Tour_360_Beta/contents/media');
    if (!res.ok) {
      console.error('[CORE] GitHub API retornou erro:', res.status);
      throw 'GitHub API falhou';
    }
    const data = await res.json();
    const paths = data.map(item => item.path.replace('media/', './media/'));
    console.log('[CORE] Lista obtida do GitHub:', paths);
    return paths;
  } else {
    console.log('[CORE] Offline: listando do cache');
    const cache = await caches.open('tour360-v3');
    const requests = await cache.keys();
    const paths = requests
      .map(r => new URL(r.url).pathname)
      .filter(p => p.match(/\/media\//))
      .map(p => '.' + p);
    console.log('[CORE] Lista obtida do cache:', paths);
    return paths;
  }
}

async function init() {
  console.log('[CORE] init() iniciado');

  if ('serviceWorker' in navigator) {
    console.log('[CORE] Registrando Service Worker');
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(() => console.log('[CORE] SW registrado com sucesso'))
      .catch(e => console.warn('[CORE] SW falhou:', e));
  }

  let mediaList;
  try {
    mediaList = await getMediaList();
  } catch (e) {
    console.error('[CORE] Falha ao obter mediaList:', e);
    return;
  }

  // FILTRO CORRIGIDO: usa includes em vez da regex que não bateu
  const lowerList = mediaList.map(p => p.toLowerCase());
  const monoList   = mediaList.filter((p, i) => lowerList[i].includes('mono.'));
  const stereoList = mediaList.filter((p, i) => lowerList[i].includes('stereo.'));
  console.log('[CORE] monoList:', monoList);
  console.log('[CORE] stereoList:', stereoList);

  if (!monoList.length || !stereoList.length) {
    console.error('[CORE] Sem mídias mono ou estéreo disponíveis');
    return;
  }

  const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  console.log('[CORE] XR suportado?', xrSupported);

  const appDiv = document.getElementById('app');
  if (!appDiv) {
    console.error('[CORE] <div id="app"> não encontrado');
    return;
  }

  function buildScene(src, isVideo) {
    console.log(`[CORE] buildScene -> src: ${src} | isVideo: ${isVideo}`);
    appDiv.innerHTML = '';

    const scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

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
    assetEl.addEventListener('error', e => console.error('[CORE] Erro carregando asset:', e));
    assetEl.addEventListener('load', () => console.log('[CORE] Asset carregado:', src));

    assets.appendChild(assetEl);
    scene.appendChild(assets);
    skyEl.setAttribute('src', isVideo ? '#skyVid' : '#skyTex');
    scene.appendChild(skyEl);
    appDiv.appendChild(scene);

    scene.addEventListener('enter-vr', async () => {
      console.log('[CORE] enter-vr');
      const stereoSrc = stereoList[0];
      const ext = stereoSrc.split('.').pop().toLowerCase();
      const stereoIsVideo = ['mp4','webm'].includes(ext);
      console.log('[CORE] stereoIsVideo?', stereoIsVideo);
      assetEl.src = stereoSrc;

      if (!isVideo && stereoIsVideo) {
        console.log('[CORE] Rebuild scene para vídeo estéreo');
        buildScene(stereoSrc, true);
      } else {
        console.log('[CORE] Adicionando componente estéreo');
        skyEl.setAttribute('stereo', '');
      }

      try {
        await loadScript('js/motionControllers.js');
      } catch(e) {
        console.warn('[CORE] Falha ao carregar motionControllers', e);
      }
    });
  }

  const monoSrc = monoList[0];
  const ext     = monoSrc.split('.').pop().toLowerCase();
  buildScene(monoSrc, ['mp4','webm'].includes(ext));
}

loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error('[CORE] Erro JS inicial:', err));

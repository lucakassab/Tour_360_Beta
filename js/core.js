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

// busca mídias via GitHub API ou cache
async function getMediaList() {
  if (navigator.onLine) {
    const res = await fetch('https://api.github.com/repos/lucakassab/Tour_360_Beta/contents/media');
    if (!res.ok) throw 'GitHub API falhou';
    const data = await res.json();
    return data.map(item => item.path.replace('media/', './media/'));
  } else {
    const cache = await caches.open('tour360-v3');
    const requests = await cache.keys();
    return requests
      .map(r => new URL(r.url).pathname)
      .filter(p => p.match(/\/media\//))
      .map(p => '.' + p);
  }
}

async function init() {
  // registra SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch(e => console.warn('SW falhou:', e));
  }

  const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  const appDiv      = document.getElementById('app');
  let mediaList;
  try {
    mediaList = await getMediaList();
  } catch (e) {
    console.error('Erro ao listar mídias:', e);
    return;
  }

  // filtra mono/stereo (case-insensitive)
  const monoList   = mediaList.filter(p => /(?:_|-|\b)mono\./i.test(p));
  const stereoList = mediaList.filter(p => /(?:_|-|\b)stereo\./i.test(p));
  if (!monoList.length || !stereoList.length) {
    console.error('Sem mídias mono ou estéreo disponíveis:', mediaList);
    return;
  }

  // função que monta cena com o src dado
  function buildScene(src, isVideo) {
    appDiv.innerHTML = '';
    const scene  = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    if (xrSupported) scene.setAttribute('vr-mode-ui', 'enabled: true');

    const assets = document.createElement('a-assets');
    let assetEl, skyEl;

    if (isVideo) {
      assetEl = document.createElement('video');
      assetEl.setAttribute('id', 'skyVid');
      assetEl.setAttribute('loop', '');
      assetEl.setAttribute('autoplay', '');
      assetEl.setAttribute('crossorigin', 'anonymous');
      assetEl.src = src;
      skyEl = document.createElement('a-videosphere');
      skyEl.setAttribute('src', '#skyVid');
    } else {
      assetEl = document.createElement('img');
      assetEl.setAttribute('id', 'skyTex');
      assetEl.src = src;
      skyEl = document.createElement('a-sky');
      skyEl.setAttribute('src', '#skyTex');
    }

    assets.appendChild(assetEl);
    scene.appendChild(assets);
    scene.appendChild(skyEl);
    appDiv.appendChild(scene);

    // ao entrar em VR, recarrega cena com estéreo
    scene.addEventListener('enter-vr', async () => {
      const stereoSrc = stereoList[0];
      const ext = stereoSrc.split('.').pop().toLowerCase();
      const stereoIsVideo = ext === 'mp4' || ext === 'webm';
      assetEl.src = stereoSrc;
      if (!isVideo && stereoIsVideo) {
        // trocar img→video: recarrega tudo
        buildScene(stereoSrc, true);
      } else {
        // só adiciona componente estéreo
        skyEl.setAttribute('stereo', '');
      }
      try { await loadScript('js/motionControllers.js'); }
      catch(e){ console.warn(e); }
    });
  }

  // escolhe primeiro mono
  const monoSrc = monoList[0];
  const ext     = monoSrc.split('.').pop().toLowerCase();
  const isVid   = ext === 'mp4' || ext === 'webm';
  buildScene(monoSrc, isVid);
}

// carrega A-Frame → plugin estéreo → init
loadScript('js/aframe.min.js')
  .then(() => loadScript('js/aframe-stereo-component.min.js'))
  .then(init)
  .catch(err => console.error(err));

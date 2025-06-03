// loader.js

(async () => {
  // 1) Inicializa mobile ou desktop primeiro
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let mediaModule = await import(isMobile ? './mobile.js' : './desktop.js');
  mediaModule.initialize();

  // 2) Carrega a lista de mídias e preenche o select; só então chama mediaModule.loadMedia
  const GITHUB_API = 'https://api.github.com/repos/lucakassab/tour_360_beta/contents/media';
  const EXT = ['.jpg', '.png', '.mp4', '.webm', '.mov'];
  let mediaList = [];
  try {
    const resp = await fetch(GITHUB_API);
    if (resp.ok) {
      const arr = await resp.json();
      mediaList = arr
        .filter(f => EXT.some(ext => f.name.toLowerCase().endsWith(ext)))
        .map(f => ({
          name:   f.name,
          url:    f.download_url,
          stereo: f.name.toLowerCase().includes('_stereo')
        }));
    } else {
      console.error('Falha ao buscar mídias:', resp.status);
    }
  } catch (e) {
    console.error('Erro ao buscar mídias:', e);
  }

  const select = document.getElementById('mediaSelect');
  mediaList.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    opt.setAttribute('data-url', m.url);
    opt.setAttribute('data-stereo', m.stereo ? 'true' : 'false');
    select.appendChild(opt);
  });

  document.getElementById('btnLoad').addEventListener('click', () => {
    const idx = parseInt(select.value);
    const opt = select.options[idx];
    if (!opt) return;
    const url    = opt.getAttribute('data-url');
    const stereo = opt.getAttribute('data-stereo') === 'true';
    mediaModule.loadMedia(url, stereo);
  });

  if (mediaList.length) {
    const primeiro = select.options[0];
    const url0     = primeiro.getAttribute('data-url');
    const stereo0  = primeiro.getAttribute('data-stereo') === 'true';
    mediaModule.loadMedia(url0, stereo0);
  }

  // 3) Só depois de ter carregado e exibido a mídia é que tentamos importar o módulo VR
  if (navigator.xr && await navigator.xr.isSessionSupported?.('immersive-vr')) {
    try {
      const vrModule = await import('./vr.js');
      vrModule.initialize();
      vrModule.onEnterXR = () => {
        mediaModule = vrModule;
        if (vrModule.lastMediaURL) {
          vrModule.loadMedia(vrModule.lastMediaURL, vrModule.lastMediaStereo);
        }
      };
    } catch (e) {
      console.warn('Módulo VR não pôde ser carregado:', e);
      // Continua normalmente sem VR
    }
  }
})();

// js/loader.js
//
// Agora usa caminho RELATIVO (“media/…”) em vez de f.download_url
// → funciona offline porque o Service Worker intercepta pedidos da mesma origem.

(async () => {
  /* 1) Inicializa módulo mobile ou desktop */
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let mediaModule = await import(isMobile ? './mobile.js' : './desktop.js');
  mediaModule.initialize();

  /* 2) Busca lista de arquivos na pasta /media do GitHub */
  const GITHUB_API = 'https://api.github.com/repos/lucakassab/tour_360_beta/contents/media';
  const EXT        = ['.jpg', '.png', '.mp4', '.webm', '.mov'];
  let mediaList    = [];

  try {
    const resp = await fetch(GITHUB_API);
    if (resp.ok) {
      const arr = await resp.json();
      mediaList = arr
        .filter(f => EXT.some(ext => f.name.toLowerCase().endsWith(ext)))
        .map(f => ({
          name:   f.name,
          url:    `media/${f.name}`,          // <<< caminho relativo!
          stereo: f.name.toLowerCase().includes('_stereo')
        }));
    } else {
      console.error('Falha ao buscar mídias:', resp.status);
    }
  } catch (e) {
    console.error('Erro ao buscar mídias:', e);
  }

  /* 3) Preenche o <select> com a lista */
  const select = document.getElementById('mediaSelect');
  mediaList.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value   = i;
    opt.textContent     = m.name;
    opt.dataset.url     = m.url;
    opt.dataset.stereo  = m.stereo ? 'true' : 'false';
    select.appendChild(opt);
  });

  /* 4) Carrega mídia quando o select muda */
  select.addEventListener('change', () => {
    const opt = select.selectedOptions[0];
    if (!opt) return;
    mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === 'true');
  });

  /* 5) Botões Anterior / Próximo */
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (!select.options.length) return;
    let idx = (parseInt(select.value) - 1 + select.options.length) % select.options.length;
    select.value = idx;
    select.dispatchEvent(new Event('change'));
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!select.options.length) return;
    let idx = (parseInt(select.value) + 1) % select.options.length;
    select.value = idx;
    select.dispatchEvent(new Event('change'));
  });

  /* 6) Carrega a primeira mídia automaticamente */
  if (mediaList.length) {
    select.value = 0;
    select.dispatchEvent(new Event('change'));
  }

  /* 7) Tenta habilitar VR */
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
    }
  }
})();

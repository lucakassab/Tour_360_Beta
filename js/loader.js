// loader.js

(async () => {
  // 1) Inicializa mobile ou desktop primeiro
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let mediaModule = await import(isMobile ? './mobile.js' : './desktop.js');
  mediaModule.initialize();

  // 2) Busca a lista de mídias no GitHub e preenche o <select>
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

  // 3) Carrega a mídia sempre que o <select> mudar, sem botão extra
  select.addEventListener('change', () => {
    const idx = parseInt(select.value);
    const opt = select.options[idx];
    if (!opt) return;
    const url    = opt.getAttribute('data-url');
    const stereo = opt.getAttribute('data-stereo') === 'true';
    mediaModule.loadMedia(url, stereo);
  });

  // 4) Botões "Anterior" e "Próximo"
  document.getElementById('prevBtn').addEventListener('click', () => {
    const total = select.options.length;
    if (!total) return;
    let idx = parseInt(select.value);
    idx = (idx - 1 + total) % total;
    select.value = idx; // Isso dispara o change e carrega a mídia
    const opt = select.options[idx];
    mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === 'true');
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    const total = select.options.length;
    if (!total) return;
    let idx = parseInt(select.value);
    idx = (idx + 1) % total;
    select.value = idx; // dispara o change
    const opt = select.options[idx];
    mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === 'true');
  });

  // 5) Carrega a primeira mídia por padrão (índice 0)
  if (mediaList.length) {
    select.value = 0;
    const primeiro = select.options[0];
    mediaModule.loadMedia(primeiro.dataset.url, primeiro.dataset.stereo === 'true');
  }

  // 6) Depois que já carregou tudo, tenta inicializar VR (com try/catch)
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

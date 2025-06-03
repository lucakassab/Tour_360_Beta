// loader.js

(async () => {
  // 1) Descobre se é mobile ou desktop
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let mediaModule = await import(isMobile ? './mobile.js' : './desktop.js');
  // Inicializa a cena (cria renderer, câmera, esfera oculta, etc)
  mediaModule.initialize();

  // 2) Busca a lista de mídias no GitHub
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
      console.log('[loader] mediaList:', mediaList);
    } else {
      console.error('Falha ao buscar mídias:', resp.status);
    }
  } catch (e) {
    console.error('Erro ao buscar mídias:', e);
  }
  // 3) Preenche o <select id="mediaSelect">
  const select = document.getElementById('mediaSelect');
  mediaList.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    opt.setAttribute('data-url', m.url);
    opt.setAttribute('data-stereo', m.stereo ? 'true' : 'false');
    select.appendChild(opt);
  });

  // 4) Quando o usuário mudar o <select>, carrega a mídia correspondente
  select.addEventListener('change', () => {
    const idx = parseInt(select.value);
    const opt = select.options[idx];
    if (!opt) return;
    const url    = opt.getAttribute('data-url');
    const stereo = opt.getAttribute('data-stereo') === 'true';
    mediaModule.loadMedia(url, stereo);
  });

  // 5) Botões “Anterior” e “Próximo” (já atualizam o select e disparam loadMedia)
  document.getElementById('prevBtn').addEventListener('click', () => {
    const total = select.options.length;
    if (!total) return;
    let idx = parseInt(select.value);
    idx = (idx - 1 + total) % total;
    select.value = idx; // DISPARA o change automaticamente
    const opt = select.options[idx];
    mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === 'true');
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    const total = select.options.length;
    if (!total) return;
    let idx = parseInt(select.value);
    idx = (idx + 1) % total;
    select.value = idx; // DISPARA o change automaticamente
    const opt = select.options[idx];
    mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === 'true');
  });

  // 6) Carrega a primeira mídia (índice 0) automaticamente se houver algo na lista
  if (mediaList.length) {
    select.value = 0;
    const primeiro = select.options[0];
    mediaModule.loadMedia(primeiro.dataset.url, primeiro.dataset.stereo === 'true');
  }

  // 7) Depois, tenta inicializar VR (se suportado), num try/catch pra não travar
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
      // segue sem VR
    }
  }
})();

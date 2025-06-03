// js/loader.js
//
// Fluxo:
// 1. Abre o cache “tour360-media-v1”.
// 2. Se já existir pelo menos 1 arquivo em media/* no cache → usa offline direto.
// 3. Caso contrário, (1ª visita online) usa a GitHub API para listar a pasta
//    /media, baixa cada arquivo, guarda no cache e só então monta a UI.
// 4. Toda navegação (select / botões) usa sempre o mesmo caminho relativo
//    “media/arquivo.ext”, que será servido do cache quando offline.

(async () => {
  /* ---------- CONFIG ---------- */
  const CACHE_MEDIA = "tour360-media-v1";
  const GITHUB_API  = "https://api.github.com/repos/lucakassab/tour_360_beta/contents/media";
  const EXT         = [".jpg", ".png", ".mp4", ".webm", ".mov"];

  /* ---------- Inicializa módulo desktop / mobile ---------- */
  const isMobile   = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let   mediaModule = await import(isMobile ? "./mobile.js" : "./desktop.js");
  mediaModule.initialize();

  /* ---------- Funções utilitárias ---------- */
  const openMediaCache = () => caches.open(CACHE_MEDIA);

  async function listCachedMedia() {
    const cache = await openMediaCache();
    const keys  = await cache.keys();
    return keys
      .filter(req => req.url.includes("/media/"))
      .map(req  => {
        const name = req.url.split("/").pop();
        return {
          name,
          url:  `media/${name}`,
          stereo: name.toLowerCase().includes("_stereo")
        };
      });
  }

  async function downloadAndCacheAll() {
    const resp = await fetch(GITHUB_API);
    if (!resp.ok) throw new Error("GitHub API falhou: " + resp.status);
    const arr  = await resp.json();

    const mediaFromApi = arr
      .filter(f => EXT.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        name:   f.name,
        url:    `media/${f.name}`, // sempre mesmo-origin
        stereo: f.name.toLowerCase().includes("_stereo")
      }));

    const cache = await openMediaCache();
    let   done  = 0;
    for (const m of mediaFromApi) {
      try {
        const r = await fetch(m.url, { cache: "no-cache" }); // força baixar 1ª vez
        if (r.ok) await cache.put(m.url, r.clone());
        else console.warn("Não baixou:", m.url, r.status);
      } catch (e) {
        console.warn("Falhou baixar:", m.url, e);
      }
      console.log(`Pré-cache ${(++done)}/${mediaFromApi.length}:`, m.name);
    }
    return mediaFromApi;
  }

  /* ---------- Obtém a lista final (cache ou rede) ---------- */
  let mediaList = await listCachedMedia();

  if (mediaList.length === 0) {
    if (!navigator.onLine) {
      alert("Sem mídias no cache e você está offline. Volte quando tiver internet 😊");
      return;
    }
    try {
      mediaList = await downloadAndCacheAll();
    } catch (e) {
      console.error("Não deu pra baixar mídias:", e);
      alert("Falha ao baixar mídias. Veja o console.");
      return;
    }
  }

  /* ---------- Preenche UI ---------- */
  const select = document.getElementById("mediaSelect");
  mediaList.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value         = i;
    opt.textContent   = m.name;
    opt.dataset.url   = m.url;
    opt.dataset.stereo= m.stereo ? "true" : "false";
    select.appendChild(opt);
  });

  /* change → load */
  select.addEventListener("change", () => {
    const opt = select.selectedOptions[0];
    if (opt) mediaModule.loadMedia(opt.dataset.url, opt.dataset.stereo === "true");
  });

  /* Botões Prev / Next */
  const step = delta => {
    if (!select.options.length) return;
    let idx = (parseInt(select.value) + delta + select.options.length) % select.options.length;
    select.value = idx;
    select.dispatchEvent(new Event("change"));
  };
  document.getElementById("prevBtn").onclick = () => step(-1);
  document.getElementById("nextBtn").onclick = () => step(+1);

  /* Carrega a primeira mídia */
  if (mediaList.length) {
    select.value = 0;
    select.dispatchEvent(new Event("change"));
  }

  /* ---------- VR (opcional) ---------- */
  if (navigator.xr && await navigator.xr.isSessionSupported?.("immersive-vr")) {
    try {
      const vrModule = await import("./vr.js");
      vrModule.initialize();
      vrModule.onEnterXR = () => {
        mediaModule = vrModule;
        if (vrModule.lastMediaURL) {
          vrModule.loadMedia(vrModule.lastMediaURL, vrModule.lastMediaStereo);
        }
      };
    } catch (e) {
      console.warn("VR não disponível:", e);
    }
  }
})();

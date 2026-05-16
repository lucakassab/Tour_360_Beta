const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'source_tour');
const buildDir = path.join(rootDir, '.build_tmp');
const buildId = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const npxCommand = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const npxPrefixArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npx.cmd'] : [];

const requiredSourceFiles = [
  'index.html',
  'manifest.json',
  'main/core.js',
  'main/mobile.js',
  'main/desktop.js',
  'main/shared/utils.js',
  'assets/vendor/three.min.js'
];

function resolveInsideRoot(...parts) {
  const target = path.resolve(rootDir, ...parts);

  if (target !== rootDir && !target.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Unsafe path outside repository: ${target}`);
  }

  return target;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

function runNpx(args) {
  run(npxCommand, [...npxPrefixArgs, ...args]);
}

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(source, target, options = {}) {
  const ignore = options.ignore || (() => false);

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    const relativeSource = path.relative(sourceDir, sourcePath).replace(/\\/g, '/');

    if (ignore(relativeSource, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      ensureDir(targetPath);
      copyDir(sourcePath, targetPath, options);
      continue;
    }

    if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);

  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  const found = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        found.push(`./${path.relative(rootDir, fullPath).replace(/\\/g, '/')}`);
      }
    }
  }

  walk(absoluteDir);
  return found.sort();
}

function assertSourceReady() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      'source_tour nao existe. Recupere ou crie a pasta source_tour com o codigo fonte antes de gerar a versao ofuscada.'
    );
  }

  for (const file of requiredSourceFiles) {
    const absolutePath = path.join(sourceDir, file);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Arquivo fonte obrigatorio ausente: source_tour/${file}`);
    }
  }
}

function prepareBuildDir() {
  remove(buildDir);
  ensureDir(buildDir);
}

function bundleAndObfuscateApp() {
  const bundlePath = path.join(buildDir, 'tour.bundle.js');
  const outputMainDir = resolveInsideRoot('main');
  const outputPath = path.join(outputMainDir, 'tour.app.js');

  remove(outputMainDir);
  ensureDir(outputMainDir);

  runNpx([
    '--yes',
    'esbuild@0.25.10',
    path.join(sourceDir, 'main/core.js'),
    '--bundle',
    '--format=iife',
    '--target=es2018',
    `--outfile=${bundlePath}`,
    '--log-level=warning'
  ]);

  runNpx([
    '--yes',
    'javascript-obfuscator@4.1.1',
    bundlePath,
    '--output',
    outputPath,
    '--compact',
    'true',
    '--control-flow-flattening',
    'true',
    '--control-flow-flattening-threshold',
    '0.55',
    '--dead-code-injection',
    'false',
    '--identifier-names-generator',
    'hexadecimal',
    '--rename-globals',
    'false',
    '--string-array',
    'true',
    '--string-array-calls-transform',
    'true',
    '--string-array-calls-transform-threshold',
    '0.5',
    '--string-array-encoding',
    'base64',
    '--string-array-threshold',
    '0.85',
    '--transform-object-keys',
    'true',
    '--unicode-escape-sequence',
    'true',
    '--target',
    'browser'
  ]);
}

function copyStaticAssets() {
  const outputAssetsDir = resolveInsideRoot('assets');

  remove(outputAssetsDir);
  ensureDir(outputAssetsDir);
  copyDir(path.join(sourceDir, 'assets'), outputAssetsDir, {
    ignore: (relativeSource) => relativeSource.startsWith('assets/panoramas/stereo_images')
  });
}

function writeIndex() {
  const sourceIndexPath = path.join(sourceDir, 'index.html');
  const outputIndexPath = resolveInsideRoot('index.html');
  let html = fs.readFileSync(sourceIndexPath, 'utf8');

  html = html.replace(
    /<script\s+type="module"\s+src="\.\/main\/core\.js(?:\?v=[^"]*)?"><\/script>/,
    `<script src="./main/tour.app.js?v=${buildId}"></script>`
  );
  html = html.replace(/>Avan(?:ç|&ccedil;)ar<\/button>/g, '>Avan&ccedil;ar</button>');

  fs.writeFileSync(outputIndexPath, html, 'utf8');
}

function copyProjectFiles() {
  copyFile(path.join(sourceDir, 'manifest.json'), resolveInsideRoot('manifest.json'));
  copyFile(path.join(sourceDir, 'run-tour-360.bat'), resolveInsideRoot('run-tour-360.bat'));
  copyFile(path.join(sourceDir, 'run-tour-360-https.bat'), resolveInsideRoot('run-tour-360-https.bat'));

  const outputScriptsDir = resolveInsideRoot('scripts');

  remove(outputScriptsDir);
  ensureDir(outputScriptsDir);
  copyFile(
    path.join(sourceDir, 'scripts/create-local-https-cert.ps1'),
    path.join(outputScriptsDir, 'create-local-https-cert.ps1')
  );

  runNpx([
    '--yes',
    'javascript-obfuscator@4.1.1',
    path.join(sourceDir, 'scripts/https-server.js'),
    '--output',
    path.join(outputScriptsDir, 'https-server.js'),
    '--compact',
    'true',
    '--control-flow-flattening',
    'true',
    '--control-flow-flattening-threshold',
    '0.45',
    '--dead-code-injection',
    'false',
    '--identifier-names-generator',
    'hexadecimal',
    '--rename-globals',
    'false',
    '--string-array',
    'true',
    '--string-array-encoding',
    'base64',
    '--string-array-threshold',
    '0.8',
    '--unicode-escape-sequence',
    'true',
    '--target',
    'node'
  ]);

  fs.writeFileSync(resolveInsideRoot('.nojekyll'), '');
}

function writeServiceWorker() {
  const serviceWorkerSourcePath = path.join(buildDir, 'service-worker.source.js');
  const serviceWorkerOutputPath = resolveInsideRoot('service-worker.js');
  const coreAssets = [
    './',
    './index.html',
    './manifest.json',
    './assets/vendor/three.min.js',
    `./main/tour.app.js?v=${buildId}`,
    ...listFiles('assets/brand'),
    ...listFiles('assets/icons')
  ];
  const source = `const CACHE_NAME = 'tour-360-obf-${buildId}';

const CORE_ASSETS = ${JSON.stringify(coreAssets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response && (response.ok || response.type === 'opaque')) {
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, response.clone()))
        .catch(() => {});
    }

    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');

      if (fallback) {
        return fallback;
      }

      return new Response('<!doctype html><title>Tour 360</title><p>Tour 360 indisponivel offline.</p>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }

    return new Response('', {
      status: 504,
      statusText: 'Offline'
    });
  }
}
`;

  fs.writeFileSync(serviceWorkerSourcePath, source, 'utf8');

  runNpx([
    '--yes',
    'javascript-obfuscator@4.1.1',
    serviceWorkerSourcePath,
    '--output',
    serviceWorkerOutputPath,
    '--compact',
    'true',
    '--control-flow-flattening',
    'true',
    '--control-flow-flattening-threshold',
    '0.45',
    '--dead-code-injection',
    'false',
    '--identifier-names-generator',
    'hexadecimal',
    '--rename-globals',
    'false',
    '--string-array',
    'true',
    '--string-array-encoding',
    'base64',
    '--string-array-threshold',
    '0.8',
    '--unicode-escape-sequence',
    'true',
    '--target',
    'browser'
  ]);
}

function removeOldSourceLikeFiles() {
  [
    'ofus_tour',
    'imagem_logo_com_fundo_banco.jpeg',
    'main/core.js',
    'main/mobile.js',
    'main/desktop.js',
    'main/shared'
  ].forEach((relativePath) => remove(resolveInsideRoot(relativePath)));
}

function validateOutput() {
  run('node', ['--check', resolveInsideRoot('main/tour.app.js')]);
  run('node', ['--check', resolveInsideRoot('service-worker.js')]);
  run('node', ['--check', resolveInsideRoot('scripts/https-server.js')]);
}

function main() {
  console.log('Gerando versao ofuscada do Tour 360...');
  assertSourceReady();
  prepareBuildDir();
  copyStaticAssets();
  copyProjectFiles();
  bundleAndObfuscateApp();
  writeIndex();
  writeServiceWorker();
  removeOldSourceLikeFiles();
  validateOutput();
  console.log(`Versao ofuscada gerada com cache build ${buildId}.`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

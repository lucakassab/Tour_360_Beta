const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const port = Number(readArg('--port', process.env.PORT || 8443));
const pfxPath = path.resolve(readArg('--pfx', '.certs/tour-360-local.pfx'));
const passphrase = readArg('--pass', process.env.TOUR_360_HTTPS_PASSWORD || 'tour-360-local');
const root = path.resolve(__dirname, '..');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function getLocalIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `https://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  if (pathname === '/favicon.ico') {
    pathname = '/assets/icons/favicon.ico';
  }

  const filePath = path.resolve(root, `.${pathname}`);
  const relativePath = path.relative(root, filePath);

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    relativePath.startsWith('.git') ||
    relativePath.startsWith('.certs')
  ) {
    return null;
  }

  return filePath;
}

const server = https.createServer(
  {
    pfx: fs.readFileSync(pfxPath),
    passphrase,
  },
  (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    const filePath = resolveRequestPath(request.url);

    if (!filePath) {
      send(response, 403, 'Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(response, 404, 'Not Found');
        return;
      }

      const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      send(response, 200, request.method === 'HEAD' ? '' : data, { 'Content-Type': contentType });
    });
  }
);

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('Tour 360 - servidor HTTPS local');
  console.log('--------------------------------');
  console.log(`Pasta: ${root}`);
  console.log(`Local: https://localhost:${port}/`);

  for (const ip of getLocalIps()) {
    console.log(`iPhone/rede local: https://${ip}:${port}/`);
  }

  console.log('');
  console.log('Se o iPhone avisar que o certificado nao e confiavel, instale e confie no arquivo:');
  console.log(path.join(root, '.certs', 'tour-360-local.cer'));
  console.log('');
  console.log('Pressione Ctrl+C para parar o servidor.');
});

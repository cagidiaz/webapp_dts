const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');

const host = '127.0.0.1';
const port = 15432;
let tunnel;
let app;
let stopping = false;

function portAvailable() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

function stop(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function finish(code) {
  if (stopping) return;
  stopping = true;
  stop(app);
  stop(tunnel);
  process.exit(code);
}

process.on('SIGINT', () => finish(0));
process.on('SIGTERM', () => finish(0));

async function main() {
  if (!(await portAvailable())) {
    console.error(`El puerto ${host}:${port} está ocupado. Cierra el proceso que lo utiliza antes de iniciar el entorno.`);
    process.exitCode = 1;
    return;
  }
  console.log('Abriendo el túnel SSH. Introduce la frase de paso si se solicita.');
  tunnel = spawn('ssh', ['-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-N', '-L', `${host}:${port}:127.0.0.1:5432`, 'root@187.124.42.101'], { stdio: 'inherit' });
  tunnel.on('error', (error) => { console.error('No se pudo iniciar SSH:', error.message); finish(1); });
  tunnel.on('exit', (code) => { if (!stopping) { console.error(`El túnel SSH se cerró (${code ?? 'señal'}).`); finish(1); } });

  // SSH may need interactive authentication; do not impose a short timeout.
  while (!stopping && await portAvailable()) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (stopping) return;
  console.log('Túnel abierto. Iniciando aplicación.');
  app = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:https:app'], { stdio: 'inherit', shell: process.platform === 'win32' });
  app.on('error', (error) => { console.error('No se pudo iniciar la aplicación:', error.message); finish(1); });
  app.on('exit', (code) => finish(code ?? 1));
}

main().catch((error) => { console.error(error.message); finish(1); });

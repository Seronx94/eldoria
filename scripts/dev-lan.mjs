import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// Run Vite with the current Node executable: npm is a .cmd shim on Windows.
const require = createRequire(import.meta.url);
let vite;
try {
  vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
} catch {
  console.error('Brak Vite. Uruchom npm ci w katalogu Eldorii i spróbuj ponownie.');
  process.exit(1);
}
const child = spawn(process.execPath, [vite, '--config', 'apps/client/vite.config.ts', '--host', '0.0.0.0', '--port', '5173', '--strictPort'], {
  cwd: resolve(import.meta.dirname, '..'), stdio: 'inherit'
});
child.on('spawn', () => {
  for (const group of Object.values(networkInterfaces())) for (const address of group ?? []) {
    if (address.family === 'IPv4' && !address.internal) console.log(`Telefon w tej samej sieci (po uruchomieniu Vite): http://${address.address}:5173`);
  }
  console.log('Serwer LAN. Nie przekierowuj portu na routerze do Internetu.');
});
child.on('error', error => { console.error(`Nie udało się uruchomić serwera LAN: ${error.message}`); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

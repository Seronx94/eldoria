import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
for (const group of Object.values(networkInterfaces())) for (const address of group ?? []) {
  if (address.family === 'IPv4' && !address.internal) console.log(`Telefon w tej samej sieci: http://${address.address}:5173`);
}
console.log('Serwer LAN. Nie przekierowuj portu na routerze do Internetu.');
const child = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0'], { stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

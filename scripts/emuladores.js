// Sobe os emuladores guardando os dados em emulator-data/ ao fechar (Ctrl+C),
// para que o que foi cadastrado na tela continue lá na próxima vez.
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const pastaDados = path.join(raiz, 'emulator-data');
const cli = path.join(raiz, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');

const argumentos = [cli, 'emulators:start', '--only', 'auth,firestore', '--project', 'ferramentaria-68f52', '--export-on-exit', pastaDados];
if (existsSync(path.join(pastaDados, 'firebase-export-metadata.json'))) {
  argumentos.push('--import', pastaDados);
}

const processo = spawn(process.execPath, argumentos, { cwd: raiz, stdio: 'inherit' });
processo.on('exit', (codigo) => process.exit(codigo ?? 0));

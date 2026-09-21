import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

const rawArgs = process.argv.slice(2);
const nextArgs = ['dev'];

let hasPort = false;
let hasHost = false;

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    hasHost = true;
    nextArgs.push('-H', rawArgs[++i] || '0.0.0.0');
  } else if (arg.startsWith('--host=')) {
    hasHost = true;
    nextArgs.push('-H', arg.split('=')[1]);
  } else if (arg === '--port' || arg === '-p') {
    hasPort = true;
    nextArgs.push('-p', rawArgs[++i] || '3000');
  } else if (arg.startsWith('--port=')) {
    hasPort = true;
    nextArgs.push('-p', arg.split('=')[1]);
  } else if (arg === '-H') {
    hasHost = true;
    nextArgs.push('-H', rawArgs[++i] || '0.0.0.0');
  } else if (!arg.startsWith('--host')) {
    nextArgs.push(arg);
  }
}

if (!hasPort) {
  nextArgs.push('-p', '3000');
}
if (!hasHost) {
  nextArgs.push('-H', '0.0.0.0');
}

process.env.PORT = '3000';
process.argv = [process.argv[0], nextBin, ...nextArgs];

await import(nextBin);

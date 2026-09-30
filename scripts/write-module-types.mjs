// Marks each build output directory with its module format so Node.js picks the right loader.
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
writeFileSync(new URL('../dist/esm/package.json', import.meta.url), JSON.stringify({ type: 'module' }, null, 2) + '\n');

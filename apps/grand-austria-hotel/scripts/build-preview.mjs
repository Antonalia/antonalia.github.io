import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({entryPoints:[resolve(root,'preview-src/preview.mjs')],outfile:resolve(root,'public/preview-engine.mjs'),bundle:true,format:'esm',platform:'browser',target:['es2022'],charset:'utf8',minify:true,legalComments:'none',alias:{'node:crypto':resolve(root,'preview-src/random.mjs')}});
console.log('Browser preview built. Only catalog facts and the pure rules engine are included.');

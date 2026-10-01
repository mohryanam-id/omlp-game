import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['assets', 'css', 'js']) {
  await cp(new URL(`../${name}`, import.meta.url), new URL(name, out), { recursive: true, filter: path => !path.endsWith('.DS_Store') });
}
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const webOnly = process.argv.includes('--web-only');
await writeFile(new URL('index.html', out), webOnly ? html : html.replace('</body>', '  <script src="./native.js" defer></script>\n</body>'));
if (!webOnly) {
  const { build } = await import('esbuild');
  await build({ entryPoints: [root + 'scripts/native-entry.js'], outfile: root + 'dist/native.js', bundle: true, format: 'iife', target: 'es2020' });
}
console.log('Offline game assets prepared in dist/');

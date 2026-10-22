import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = ['index.html', 'styles.css', 'app.js', 'ai.js', 'engine.js', 'lessons.js', 'touch-preview.js'];
for (const asset of assets) {
  const path = resolve(root, 'dist', asset);
  await access(path);
  if (asset.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
for (const asset of ['styles.css', 'app.js']) {
  if (!html.includes(`"${asset}"`)) throw new Error(`index.html must reference ${asset}`);
}
console.log('YiMu: static assets and JavaScript syntax validated. Ready to deploy dist/.');

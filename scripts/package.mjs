import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { zipSync } from 'fflate';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
async function filesUnder(dir, prefix = '') {
  const entries = {};
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${item.name}`;
    const name = `${prefix}${item.name}`;
    if (item.isDirectory())
      Object.assign(entries, await filesUnder(path, `${name}/`));
    else entries[name] = new Uint8Array(await readFile(path));
  }
  return entries;
}
await mkdir('artifacts', { recursive: true });
for (const target of ['chromium', 'firefox']) {
  await writeFile(
    `artifacts/x-timeline-blocker-${target}-${pkg.version}.zip`,
    zipSync(await filesUnder(`dist/${target}`)),
  );
}
const source = {};
for (const dir of [
  'src',
  'scripts',
  'tests',
  'docs',
  'vendor',
  'public',
  '.github',
])
  Object.assign(source, await filesUnder(dir, `${dir}/`));
for (const file of [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'eslint.config.js',
  '.prettierrc.json',
  '.prettierignore',
  'devenv.nix',
  'devenv.yaml',
  'devenv.lock',
  'popup.html',
  'gate.html',
  'README.md',
  'LICENSE',
  'AGENTS.md',
  'PRODUCT.md',
  'DESIGN.md',
])
  source[file] = new Uint8Array(await readFile(file));
await writeFile(
  `artifacts/x-timeline-blocker-source-${pkg.version}.zip`,
  zipSync(source),
);
console.log(
  `Packaged Chromium, Firefox and source archives for ${pkg.version}.`,
);

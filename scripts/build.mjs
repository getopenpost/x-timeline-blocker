import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
import { readFile, writeFile, cp, rm } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await rm('dist', { recursive: true, force: true });
await viteBuild();
const base = {
  manifest_version: 3,
  name: 'X Timeline Blocker by OpenPost',
  version: pkg.version,
  description: pkg.description,
  homepage_url: 'https://openpo.st',
  icons: { 128: 'icon-128.png' },
  permissions: ['storage', 'alarms'],
  host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
  action: { default_popup: 'popup.html', default_title: 'X Timeline Blocker' },
  content_scripts: [
    {
      matches: ['https://x.com/*', 'https://twitter.com/*'],
      js: ['content.js'],
      run_at: 'document_start',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['gate.html', 'assets/*'],
      matches: ['https://x.com/*', 'https://twitter.com/*'],
    },
  ],
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'none'; connect-src 'none';",
  },
};
for (const target of ['chromium', 'firefox']) {
  const outdir = `dist/${target}`;
  await cp('dist/ui', outdir, { recursive: true });
  await build({
    entryPoints: ['src/background.ts', 'src/content.ts'],
    outdir,
    bundle: true,
    format: 'iife',
    target: ['chrome120', 'firefox140'],
    minify: true,
  });
  const manifest =
    target === 'firefox'
      ? {
          ...base,
          background: { scripts: ['background.js'] },
          browser_specific_settings: {
            gecko: {
              id: 'x-timeline-blocker@getopenpost.app',
              strict_min_version: '142.0',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {
          ...base,
          minimum_chrome_version: '120',
          background: { service_worker: 'background.js' },
        };
  await writeFile(
    `${outdir}/manifest.json`,
    JSON.stringify(manifest, null, 2) + '\n',
  );
}
await rm('dist/ui', { recursive: true });

import { readFile } from 'node:fs/promises';
import webExt from 'web-ext';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET)
  throw new Error(
    'Set AMO_API_KEY and AMO_API_SECRET in GitHub secrets before submission.',
  );
await webExt.cmd.sign(
  {
    sourceDir: 'dist/firefox',
    artifactsDir: 'artifacts/signed',
    channel: 'listed',
    apiKey: process.env.WEB_EXT_API_KEY,
    apiSecret: process.env.WEB_EXT_API_SECRET,
    amoMetadata: 'docs/amo-metadata.json',
    uploadSourceCode: `artifacts/x-timeline-blocker-source-${version}.zip`,
  },
  { shouldExitProgram: false },
);

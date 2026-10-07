# X Timeline Blocker

Five minutes of X timeline browsing per hour, with posting, messages and notifications available throughout. A standalone OpenPost extension for Chromium and Firefox.

Click **Browse timeline** to start five minutes. The next window opens one hour after that click. The timer follows you across tabs and browser restarts.

## Development

Use the project Devenv environment:

```sh
devenv shell -- npm ci
devenv shell -- npx playwright install chromium firefox
devenv shell -- npm run verify
devenv shell -- npm run package
```

Load `dist/chromium` unpacked in Chromium. Load `dist/firefox/manifest.json` temporarily through Firefox's `about:debugging`. Firefox requires version 142 or later. Packages and the review source archive are in `artifacts/`.

Only home timeline regions on `https://x.com` and `https://twitter.com` are gated. SPA route changes and replaced timeline regions are supported. The extension stores only its timer locally and makes no network requests. OpenPost is an explicit attribution link.

## Tests

Unit tests own grant serialization and timestamp boundaries. Packaged browser tests use isolated profiles and intercepted X/Twitter fixtures. They cover cross-tab grants, live expiry, browser restart, permitted routes, compose, DOM replacement, corrupt-storage recovery and popup accessibility. Fixture tests do not prove compatibility with every live X DOM revision.

## Firefox submission

The **Submit Firefox** GitHub workflow submits a listed AMO version on `v<package version>` tags or manual dispatch. Configure `AMO_API_KEY` and `AMO_API_SECRET` in GitHub secrets and the `firefox-store` environment before using it. Do not commit credentials.

The workflow runs verification, builds Firefox and uploads the source archive alongside the bundle. `docs/amo-metadata.json` supplies the first listing summary, category, license and review build instructions. Add-on ID: `x-timeline-blocker@getopenpost.app`. Mozilla controls review and approval. Preparing the workflow does not publish the extension.

Submission uses the official [web-ext listed channel and source upload](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/). Firefox uses a nonpersistent [MV3 background script](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background); Chromium uses a service worker.

## Dependency note

The extension's runtime dependencies pass npm's audit. `web-ext` has an upstream development-only `node-forge` advisory through its Android ADB dependency. This extension does not use ADB. `fx-runner` uses a patched `shell-quote` override. Keep the lockfile and review future updates before removing that override.

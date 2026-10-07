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

## Dependency note

The extension's runtime dependencies pass npm's audit. `web-ext` has an upstream development-only `node-forge` advisory through its Android ADB dependency. This extension does not use ADB. `fx-runner` uses a patched `shell-quote` override. Keep the lockfile and review future updates before removing that override.

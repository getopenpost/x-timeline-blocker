# X Timeline Blocker

- Standalone Chromium and Firefox WebExtension. No backend, accounts, analytics or remote code.
- Use the project Devenv environment locally. GitHub Actions uses Node 24 and native Ubuntu browser libraries; Nix ldd cannot validate the downloaded Firefox dependencies. Keep UI in Svelte 5 with the versioned OpenPost UI and Dither archives in vendor/. Fixed orange Dither family, system light/dark scheme, no theme picker.
- Keep popup and timeline gate minimal: timer, one next action, OpenPost attribution. No boilerplate disclaimers or feature lectures in the UI.
- Gate only X/Twitter home timeline routes. Preserve navigation, posting, messages, notifications, profiles, bookmarks and permalinks. Scope DOM hiding to the timeline region, remove it when leaving home, support SPA navigation.
- One durable timer governs every tab and popup. Grant five minutes starting from explicit Browse Timeline, then wait until one hour after that grant. Serialize grants, derive countdowns from persisted timestamps, and survive background restarts.
- Validate messages and stored state. Content scripts cannot create independent timers. Host permissions cover only x.com and twitter.com.
- Tests use isolated profiles and intercepted website fixtures, never real X accounts. Verify cross-tab grants, expiry/restart, allowed routes and browser differences at their useful public boundaries.
- CI runs Chromium headed under Xvfb. Headless Linux input can stall after a closed-shadow iframe is replaced; keep the real pointer workflow and its assertions intact.
- Use Worktrunk for worktrees. Editing agents stay in their own worktrees; preserve unrelated work. Commit by concern, do not publish without a release instruction.
- Use Vikunja through Executor for internal task state. Recall Hindsight before substantial work; do not retain memory unless the human explicitly requests it.

- Build Svelte with `compilerOptions.fragments: tree` so Firefox packages avoid dynamic HTML-template warnings. Browser packages use separate background declarations; Firefox minimum 142 covers the local-only data-collection manifest declaration.
- Gate UI lives in a bundled extension iframe. Save and restore the timeline region display style and inert/hidden state. Author CSS can override `hidden`, so enforce display only while gated.
- Firefox runtime tests install a temporary add-on through its remote-debugging protocol in an isolated Playwright profile. Keep this adapter in tests, never ship debugging permissions or endpoints.

- AMO metadata uses `version.custom_license` with the complete root LICENSE text. Keep that text synchronized with LICENSE and do not also set a license slug.

- Chrome Store updates use the official v2 client with service-account ADC. Release tags must match package and Chromium manifest versions. Never retry upload or publish automatically; check the Developer Dashboard after an uncertain response. Configure the chrome-store environment as documented in docs/chrome-release.md. Store credentials never belong in source archives.

# X Timeline Blocker

- Standalone Chromium and Firefox WebExtension. No backend, accounts, analytics or remote code.
- Use the project Devenv environment. Keep UI in Svelte 5 with the versioned OpenPost UI and Dither archives in vendor/. Fixed orange Dither family, system light/dark scheme, no theme picker.
- Keep popup and timeline gate minimal: timer, one next action, OpenPost attribution. No boilerplate disclaimers or feature lectures in the UI.
- Gate only X/Twitter home timeline routes. Preserve navigation, posting, messages, notifications, profiles, bookmarks and permalinks. Scope DOM hiding to the timeline region, remove it when leaving home, support SPA navigation.
- One durable timer governs every tab and popup. Grant five minutes starting from explicit Browse Timeline, then wait until one hour after that grant. Serialize grants, derive countdowns from persisted timestamps, and survive background restarts.
- Validate messages and stored state. Content scripts cannot create independent timers. Host permissions cover only x.com and twitter.com.
- Tests use isolated profiles and intercepted website fixtures, never real X accounts. Verify cross-tab grants, expiry/restart, allowed routes and browser differences at their useful public boundaries.
- Use Worktrunk for worktrees. Editing agents stay in their own worktrees; preserve unrelated work. Commit by concern, do not publish without a release instruction.
- Use Vikunja through Executor for internal task state. Recall Hindsight before substantial work; do not retain memory unless the human explicitly requests it.

<script lang="ts">
  import { onMount } from 'svelte';
  import browser from 'webextension-polyfill';
  import { Button } from '@openpost/ui';
  import { requestTimer } from '../client';
  import {
    formatCountdown,
    isHomeUrl,
    readWindow,
    statusAt,
    TIMER_KEY,
    type BrowseWindow,
  } from '../timer';
  let { popup = false } = $props<{ popup?: boolean }>();
  let windowState = $state<BrowseWindow | null>(null);
  let now = $state(Date.now());
  let loading = $state(true);
  let pending = $state(false);
  let error = $state(false);
  const status = $derived(statusAt(windowState, now));
  const heading = $derived(
    error
      ? 'Timer unavailable'
      : loading
        ? 'Timeline paused'
        : status.phase === 'active'
          ? 'Time left'
          : status.phase === 'locked'
            ? 'Back in'
            : 'Timeline paused',
  );
  async function refresh() {
    loading = true;
    try {
      windowState = await requestTimer('status');
      now = Date.now();
      error = false;
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  }
  async function browse() {
    pending = true;
    try {
      windowState = await requestTimer('grant');
      now = Date.now();
      error = false;
      if (popup && statusAt(windowState).phase === 'active') {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.url || !isHomeUrl(tab.url))
          await browser.tabs.create({ url: 'https://x.com/home' });
        window.close();
      }
    } catch {
      error = true;
    } finally {
      pending = false;
    }
  }
  onMount(() => {
    void refresh();
    const tick = setInterval(() => {
      now = Date.now();
    }, 250);
    const changed = (
      changes: Record<string, browser.Storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local' || !(TIMER_KEY in changes)) return;
      try {
        windowState = readWindow(changes[TIMER_KEY].newValue);
        now = Date.now();
        error = false;
        loading = false;
      } catch {
        error = true;
      }
    };
    browser.storage.onChanged.addListener(changed);
    return () => {
      clearInterval(tick);
      browser.storage.onChanged.removeListener(changed);
    };
  });
</script>

<main class:popup aria-busy={loading || pending}>
  <h1 aria-live="polite">{heading}</h1>
  <p
    class="countdown"
    role="timer"
    aria-live="off"
    aria-label={`${status.phase === 'locked' ? 'Time until next browse window' : 'Browsing time'} ${formatCountdown(status.remainingMs)}`}
  >
    {loading || error ? '--:--' : formatCountdown(status.remainingMs)}
  </p>
  <div class="action">
    {#if error}
      <Button intent="focal" onclick={refresh}>Retry</Button>
    {:else if !loading && status.phase === 'ready'}
      <Button intent="focal" onclick={browse} disabled={pending}
        >{pending ? 'Opening…' : 'Browse timeline'}</Button
      >
    {/if}
  </div>
  <a
    class="attribution"
    href="https://openpo.st"
    target="_blank"
    rel="noopener noreferrer">OpenPost</a
  >
</main>

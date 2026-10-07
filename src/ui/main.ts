import { mount } from 'svelte';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/manrope';
import { ditherTheme } from '@openpost/ui/themes/builtins/dither';
import { resolveLocalTheme } from '@openpost/ui/themes/resolve';
import { WebThemeRuntime } from '@openpost/ui/themes/runtime';
import './style.css';
import Timer from './Timer.svelte';
const appearance = matchMedia('(prefers-color-scheme: dark)');
const runtime = new WebThemeRuntime();
async function applyTheme() {
  await runtime.apply(
    resolveLocalTheme(ditherTheme, appearance.matches ? 'dark' : 'light'),
    document.documentElement,
  );
}
await applyTheme();
appearance.addEventListener('change', () => void applyTheme());
mount(Timer, {
  target: document.getElementById('root')!,
  props: { popup: location.pathname.endsWith('popup.html') },
});

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
export const EXTENSION = resolve('dist/chromium');
export async function launch(profile: string): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
    ],
  });
  await context.route(/^https:\/\/(x|twitter)\.com\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: fixtureHtml }),
  );
  return context;
}
export async function extensionId(context: BrowserContext) {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  return new URL(worker.url()).hostname;
}
export async function popup(context: BrowserContext, id: string) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${id}/popup.html`);
  return page;
}
export async function gateFrame(page: Page) {
  await page.waitForFunction(
    () => !!document.querySelector('[data-openpost-timeline-gate]'),
  );
  await new Promise<void>((resolve) => {
    const existing = page
      .frames()
      .find((frame) => frame.url().includes('/gate.html'));
    if (existing) {
      resolve();
      return;
    }
    const listener = () => {
      if (!page.frames().some((frame) => frame.url().includes('/gate.html')))
        return;
      page.off('framenavigated', listener);
      resolve();
    };
    page.on('framenavigated', listener);
  });
  return page.frames().find((frame) => frame.url().includes('/gate.html'))!;
}
export const fixtureHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>X fixture</title><style>
*{box-sizing:border-box}body{margin:0;font:16px system-ui;color:#17202a;background:#fff}header{padding:20px;border-bottom:1px solid #ddd}nav{display:flex;gap:16px;flex-wrap:wrap}a{color:inherit}main{max-width:600px;margin:auto;border-inline:1px solid #ddd;min-height:80vh}h1{font-size:20px;padding:20px;margin:0}.compose{padding:20px;border-block:1px solid #ddd}textarea{width:100%;min-height:70px;font:inherit}button{padding:10px;margin-top:10px}article{padding:25px;border-bottom:1px solid #ddd}section{display:block}@media(prefers-color-scheme:dark){body{background:#090909;color:#f2f2f2}header,main,.compose,article{border-color:#333}textarea{color:inherit;background:#181818}}
</style></head><body><header><nav><a href="/home">Home</a><a href="/messages">Messages</a><a href="/notifications">Notifications</a><a href="/i/bookmarks">Bookmarks</a><a href="/fixture">Profile</a><a href="/compose/post">Post</a><a href="/fixture/status/123">Permalink</a></nav></header><main data-testid="primaryColumn"></main><script>
function render(){const home=['/','/home','/home/'].includes(location.pathname);document.querySelector('main').innerHTML='<h1>'+ (home?'Home':location.pathname) +'</h1><div class="compose"><textarea aria-label="Post text" placeholder="What is happening?"></textarea><button id="post">Post now</button><span id="sent"></span></div>'+(home?'<section role="region" aria-label="Timeline: Your Home Timeline"><article><a href="/fixture/status/123">Timeline post</a></article><article>Another post</article></section><button id="replace">Replace timeline</button>':'<p id="allowed">This route stays available.</p>');document.querySelector('#post').onclick=()=>document.querySelector('#sent').textContent='Posted';if(home)document.querySelector('#replace').onclick=()=>{const region=document.querySelector('section');const next=region.cloneNode(true);next.hidden=false;next.inert=false;region.replaceWith(next);};}
document.addEventListener('click',event=>{const a=event.target.closest('a');if(!a)return;event.preventDefault();history.pushState({},'',a.getAttribute('href'));render();});window.addEventListener('popstate',render);render();
</script></body></html>`;

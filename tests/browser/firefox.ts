import { firefox } from '@playwright/test';
import net from 'node:net';
import { resolve } from 'node:path';
import { fixtureHtml } from './fixture';
export const FIREFOX_UUID = 'a889ed51-f48f-4c4f-9d52-6fa02db6b4e3';
// Firefox's public remote-debugging protocol installs temporary add-ons in an
// isolated Playwright profile. Playwright has no Firefox install-add-on API.
async function installTemporaryAddon(port: number) {
  const socket = net.connect(port, '127.0.0.1');
  let incoming = Buffer.alloc(0);
  let waiting: {
    actor: string;
    resolve: (value: Record<string, unknown>) => void;
    reject: (reason: Error) => void;
  } | null = null;
  const response = (actor: string) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      waiting = { actor, resolve, reject };
    });
  const root = response('root');
  socket.setTimeout(10_000, () =>
    socket.destroy(new Error('Firefox add-on installation timed out')),
  );
  socket.on('error', (error) => waiting?.reject(error));
  socket.on('data', (chunk) => {
    incoming = Buffer.concat([
      incoming,
      typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
    ]);
    while (true) {
      const colon = incoming.indexOf(':');
      if (colon < 0) return;
      const length = Number(incoming.subarray(0, colon).toString());
      if (incoming.length < colon + 1 + length) return;
      const packet = JSON.parse(
        incoming.subarray(colon + 1, colon + 1 + length).toString(),
      );
      incoming = incoming.subarray(colon + 1 + length);
      if (!waiting || packet.from !== waiting.actor) continue;
      if (packet.error)
        waiting.reject(new Error(String(packet.message ?? packet.error)));
      else waiting.resolve(packet);
      waiting = null;
    }
  });
  async function request(actor: string, type: string, values = {}) {
    const result = response(actor);
    const body = JSON.stringify({ to: actor, type, ...values });
    socket.write(`${Buffer.byteLength(body)}:${body}`);
    return result;
  }
  try {
    await root;
    const { addonsActor } = await request('root', 'getRoot');
    if (typeof addonsActor !== 'string')
      throw new Error('Firefox add-on actor unavailable');
    await request(addonsActor, 'installTemporaryAddon', {
      addonPath: resolve('dist/firefox'),
    });
  } finally {
    socket.destroy();
  }
}
export async function launchFirefox(profile: string) {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No Firefox test port');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const context = await firefox.launchPersistentContext(profile, {
    headless: true,
    args: ['-start-debugger-server', String(address.port)],
    firefoxUserPrefs: {
      'devtools.debugger.remote-enabled': true,
      'devtools.debugger.prompt-connection': false,
      'extensions.webextensions.uuids': JSON.stringify({
        'x-timeline-blocker@getopenpost.app': FIREFOX_UUID,
      }),
    },
  });
  try {
    await context.route(/^https:\/\/(x|twitter)\.com\//, (route) =>
      route.fulfill({ contentType: 'text/html', body: fixtureHtml }),
    );
    await installTemporaryAddon(address.port);
    return context;
  } catch (error) {
    await context.close();
    throw error;
  }
}

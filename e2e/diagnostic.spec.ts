import {test} from './coverage-fixture';

/**
 * TEMPORARY diagnostic for the WebKit CI failures: dumps the browser
 * console, page errors, WebSocket lifecycle events, and WebRTC feature
 * availability to the test output while the app connects. Remove once the
 * WebKit signaling issue is resolved.
 */
test('diagnostic: app startup and signaling', async ({page, browserName}) => {
  test.setTimeout(60_000);

  const log = (...args: unknown[]) => console.log(`[diag:${browserName}]`, ...args);

  page.on('console', m => log('console', m.type(), m.text().slice(0, 300)));
  page.on('pageerror', e => log('pageerror', String(e).slice(0, 500)));
  page.on('websocket', ws => {
    log('ws created', ws.url());
    ws.on('framereceived', f => log('ws recv', String(f.payload).slice(0, 100)));
    ws.on('close', () => log('ws closed', ws.url()));
    ws.on('socketerror', e => log('ws socketerror', String(e).slice(0, 300)));
  });

  await page.goto('.');
  await page.waitForTimeout(20_000);

  log('rtc', await page.evaluate(() => ({
    RTCPeerConnection: typeof (window as any).RTCPeerConnection,
    RTCDataChannel: typeof (window as any).RTCDataChannel,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
  })));
  log('body', (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n/g, ' | '));

  // Raw same-origin WebSocket probe to the signaling endpoint, independent
  // of PeerJS, to distinguish network blocking from client-side aborts.
  const wsProbe = await page.evaluate(() => new Promise<string>(resolve => {
    const events: string[] = [];
    try {
      const ws = new WebSocket(`ws://${window.location.host}/peerjs?key=peerjs&id=diagprobe&token=t&version=1.5.5`);
      ws.onopen = () => events.push('open');
      ws.onmessage = m => { events.push(`message:${m.data}`); resolve(events.join(' ')); };
      ws.onerror = () => events.push('error');
      ws.onclose = e => { events.push(`close:${e.code}`); resolve(events.join(' ')); };
      setTimeout(() => resolve(events.join(' ') || 'no-events'), 8000);
    } catch (err) {
      resolve(`constructor-threw:${(err as Error).message}`);
    }
  }));
  log('raw ws probe:', wsProbe);
});

#!/usr/bin/env node
/*
 * Local PeerJS signaling server used by the Playwright e2e tests, so the
 * suite does not depend on the public 0.peerjs.com broker. The app connects
 * to it when the REACT_APP_PEERJS_HOST env var is set (see src/lib/setup.ts);
 * production builds keep using the PeerJS cloud defaults.
 */
const {PeerServer} = require('peer');

const port = Number(process.env.PEER_SERVER_PORT || 9000);

PeerServer({port, path: '/', host: '127.0.0.1'}, () => {
  console.log(`Local PeerJS server listening on http://127.0.0.1:${port}/`);
});

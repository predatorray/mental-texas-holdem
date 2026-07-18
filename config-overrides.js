function overrideWebpack(config) {
  if (process.env.REACT_APP_COVERAGE === 'true') {
    const babelLoader = config.module.rules
      .find(rule => rule.oneOf)
      .oneOf.find(
        rule => rule.loader && rule.loader.includes('babel-loader') && rule.include
      );

    if (babelLoader) {
      babelLoader.options.plugins = (babelLoader.options.plugins || []).concat([
        'istanbul',
      ]);
    }
  }
  return config;
}

/**
 * When the e2e suite points the app at a local PeerJS signaling server
 * (REACT_APP_PEERJS_HOST set, see playwright.config.ts), proxy the /peerjs
 * path — both its HTTP API and its WebSocket — through the dev server, so
 * the browser talks to the same origin as the page itself. WebKit refuses
 * insecure cross-origin ws:// connections even to loopback addresses
 * (https://bugs.webkit.org/show_bug.cgi?id=171934), so a direct connection
 * to ws://127.0.0.1:9000 fails there while Chromium and Firefox allow it.
 */
function overrideDevServer(configFunction) {
  return function (proxy, allowedHost) {
    const config = configFunction(proxy, allowedHost);
    if (process.env.REACT_APP_PEERJS_HOST) {
      const target = `http://127.0.0.1:${process.env.PEERJS_SERVER_PORT || '9000'}`;
      config.proxy = [
        {
          context: ['/peerjs'],
          target,
          ws: true,
          logLevel: 'silent',
        },
        ...(Array.isArray(config.proxy) ? config.proxy : []),
      ];
    }
    return config;
  };
}

module.exports = {
  webpack: overrideWebpack,
  devServer: overrideDevServer,
};

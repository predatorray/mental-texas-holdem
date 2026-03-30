module.exports = function override(config) {
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
};

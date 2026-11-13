// odh-dashboard's OdhFederationPlugin applies the shared singleton policy (React, PatternFly,
// react-router, @odh-dashboard/* ...) from the packages listed in this frontend's package.json,
// so no hand-maintained `shared` map is needed. `isHost` makes standalone builds eager-share and
// bundle their imports, while federated remotes use `import: false` and consume the host's copies.
const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'aiSafety',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
      dts: true,
    }),
  ],
};

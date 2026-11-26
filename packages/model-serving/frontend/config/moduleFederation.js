const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');

// Select the source before compilation so unselected lazy imports never enter
// the remote's chunk graph. Existing dashboard builds keep the full surface.
const extensionProfile = process.env.MODEL_SERVING_EXTENSION_PROFILE ?? 'full';
const extensionEntries = new Map([
  ['full', './src/odh/extensions'],
  ['deployments', '../extensions/deployments.ts'],
]);
if (!extensionEntries.has(extensionProfile)) {
  throw new Error(`Unsupported MODEL_SERVING_EXTENSION_PROFILE: ${extensionProfile}`);
}

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'modelServing',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': extensionEntries.get(extensionProfile),
        './extension-points': './src/odh/extension-points',
      },
      dts: false,
    }),
  ],
};

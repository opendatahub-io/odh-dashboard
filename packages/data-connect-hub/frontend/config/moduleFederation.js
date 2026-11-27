const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'dataConnectHub',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
        './EmbeddableConnectionWizard': './src/app/components/EmbeddableConnectionWizardRemote',
      },
      dts: false,
    }),
  ],
};

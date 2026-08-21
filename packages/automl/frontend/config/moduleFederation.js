const { OdhFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'automl',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
    }),
  ],
};

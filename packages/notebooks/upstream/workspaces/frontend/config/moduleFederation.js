const { OdhFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'notebooks',
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
      },
    }),
  ],
};

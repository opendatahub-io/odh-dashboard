const { OdhRemoteFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhRemoteFederationPlugin({
      name: 'agentOps',
      packageJson: require('../package.json'),
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
    }),
  ],
};

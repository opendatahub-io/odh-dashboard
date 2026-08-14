const { OdhRemoteFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhRemoteFederationPlugin({
      name: 'notebooks',
      packageJson: require('../package.json'),
      exposes: {
        './extensions': './src/odh/extensions',
      },
    }),
  ],
};

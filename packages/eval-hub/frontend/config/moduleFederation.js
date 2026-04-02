const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;
const { getOdhDashboardShared } = require('../../../../config/odhDashboardShared');

const moduleFederationConfig = {
  name: 'evalHub',
  filename: 'remoteEntry.js',
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    'react-router': { singleton: true, requiredVersion: deps['react-router'] },
    'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
    '@patternfly/react-core': {
      singleton: true,
      requiredVersion: deps['@patternfly/react-core'],
    },
    ...getOdhDashboardShared(),
  },
  exposes: {
    './extensions': './src/odh/extensions',
    './extension-points': './src/odh/extension-points',
  },
  runtime: false,
  // Enable runtime for proper HMR in development
  dts: true,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};

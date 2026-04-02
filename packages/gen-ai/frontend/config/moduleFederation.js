const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;
const { getOdhDashboardShared } = require('../../../../config/odhDashboardShared');

const moduleFederationConfig = {
  name: 'genAi',
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
    '@openshift/dynamic-plugin-sdk': {
      singleton: true,
    },
    ...getOdhDashboardShared(),
  },
  exposes: {
    './extensions': './src/odh/extensions',
    './extension-points': './src/odh/extension-points',
  },
  runtime: false,
  // Enable runtime for proper HMR in development

  // TODO generate types when exposing api
  dts: false,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};

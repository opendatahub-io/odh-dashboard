const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

const deps = require('../package.json').dependencies;

const moduleFederationConfig = {
  name: 'modelRegistry',
  filename: 'remoteEntry.js',
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    'react-router': { singleton: true, requiredVersion: deps['react-router'] },
    'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
    '@patternfly/react-core': { singleton: true, requiredVersion: deps['@patternfly/react-core'] },
    '@openshift/dynamic-plugin-sdk': {
      singleton: true,
      requiredVersion: '*',
    },
    '@odh-dashboard/plugin-core': {
      singleton: true,
      requiredVersion: '0.0.0',
    },
  },
  exposes: {
    './extensions': './src/odh/extensions',
    './extension-points': './src/odh/extension-points',
  },
  // For module federation to work when optimization.runtimeChunk="single":
  // See https://github.com/webpack/webpack/issues/18810
  runtime: false,
  dts: true,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};

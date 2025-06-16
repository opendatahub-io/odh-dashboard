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
    '@patternfly/react-core': {requiredVersion: deps['@patternfly/react-core'] },
    '@patternfly/react-icons': {
      requiredVersion: deps['@patternfly/react-icons'],
    },
    '@odh-dashboard/plugin-core': {
      singleton: true,
      requiredVersion: '0.0.0',
    },
  },
  exposes: {
    './extensions': './src/odh/extensions',
  },
  // For module federation to work when optimization.runtimeChunk="single":
  // See https://github.com/webpack/webpack/issues/18810
  runtime: false,
  // TODO generate types when exposing api
  dts: false,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

const deps = require('../package.json').dependencies;

const moduleFederationConfig = {
  name: 'notebooks',
  filename: 'remoteEntry.js',

  shared: {
    react: { singleton: true, eager: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, eager: true, requiredVersion: deps['react-dom'] },
    'react-router': { singleton: true, eager: true, requiredVersion: deps['react-router'] },
    'react-router-dom': { singleton: true, eager: true, requiredVersion: deps['react-router-dom'] },
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
    // TODO expose api. eg:
    // './index': './src/plugin/index.tsx',
    // './plugin': './src/plugin/index.tsx',
    './extensions': './src/odh/extensions',
  },
  // For module federation to work when optimization.runtimeChunk="single":
  // See https://github.com/webpack/webpack/issues/18810
  runtime: false,
  // TODO generate types when exposing api
  dts: true,
};

module.exports = {
  moduleFederationPlugins: [new ModuleFederationPlugin(moduleFederationConfig)],
};

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const workspaceDeps = require('@odh-dashboard/maas/package.json').dependencies;
const deps = require('../package.json').dependencies;

const odhDashboardShared = Object.fromEntries(
  Object.keys(workspaceDeps)
    .filter((name) => name.startsWith('@odh-dashboard/'))
    .map((name) => [name, { singleton: true, requiredVersion: '*' }]),
);

const moduleFederationConfig = {
  name: 'maas',
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
    ...odhDashboardShared,
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

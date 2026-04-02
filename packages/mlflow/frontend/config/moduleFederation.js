const fs = require('fs');
const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

const odhDashboardDir = path.resolve(__dirname, '../../../../node_modules/@odh-dashboard');
const odhShared = fs.existsSync(odhDashboardDir)
  ? fs
      .readdirSync(odhDashboardDir)
      .filter((name) => !name.startsWith('.'))
      .reduce((acc, name) => {
        acc[`@odh-dashboard/${name}`] = { singleton: true, requiredVersion: '*' };
        return acc;
      }, {})
  : {};

const moduleFederationConfig = {
  name: 'mlflow',
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
    ...odhShared,
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

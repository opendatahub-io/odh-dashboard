const { execSync } = require('child_process');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

const updateTypes = !!process.env.MF_UPDATE_TYPES;

/**
 * Get all workspace packages using npm query
 * @returns {Array} Array of workspace package objects
 */
const getWorkspacePackages = () => {
  try {
    const stdout = execSync('npm query .workspace --json', {
      encoding: 'utf8',
    });
    return JSON.parse(stdout);
  } catch (error) {
    console.warn('Error querying workspaces with npm query:', error.message);
    return [];
  }
};

const workspacePackages = getWorkspacePackages();

// Function to read module federation config from workspace packages
const readModuleFederationConfigFromPackages = () => {
  const configs = [];

  try {
    for (const pkg of workspacePackages) {
      const federatedConfigProperty = pkg['module-federation'];
      if (federatedConfigProperty) {
        configs.push(federatedConfigProperty);
      }
    }
  } catch (e) {
    console.error('Failed to process workspace packages for module federation.', e);
  }

  return configs;
};

const getModuleFederationConfig = () => {
  if (process.env.MODULE_FEDERATION_CONFIG) {
    try {
      return JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    } catch (e) {
      console.error('Failed to parse module federation config from ENV', e);
    }
  } else {
    // read the module federation config from the workspace packages
    return readModuleFederationConfigFromPackages();
  }
  return [];
};

const mfConfig = getModuleFederationConfig();
if (mfConfig.length > 0) {
  console.log(
    'Federated modules:',
    mfConfig.map((c) => c.name),
  );
}

module.exports = {
  moduleFederationConfig: mfConfig,
  moduleFederationPlugins:
    mfConfig.length > 0
      ? [
          new ModuleFederationPlugin({
            name: 'host',
            filename: 'remoteEntry.js',
            remotes: updateTypes
              ? mfConfig.reduce((acc, config) => {
                  const getEnvVar = (prop) =>
                    process.env[
                      `MF_${config.name.toLocaleUpperCase()}_${prop.toLocaleUpperCase()}`
                    ];
                  const host = getEnvVar('LOCAL_HOST') ?? config.local.host ?? 'localhost';
                  const port = getEnvVar('LOCAL_PORT') ?? config.local.port;
                  acc[
                    `@mf/${config.name}`
                  ] = `${config.name}@http://${host}:${port}${config.remoteEntry}`;
                  return acc;
                }, {})
              : mfConfig.reduce((acc, config) => {
                  acc[
                    `@mf/${config.name}`
                  ] = `${config.name}@/_mf/${config.name}${config.remoteEntry}`;
                  return acc;
                }, {}),
            shared: {
              react: { singleton: true, requiredVersion: deps.react, eager: true },
              'react-dom': { singleton: true, requiredVersion: deps['react-dom'], eager: true },
              'react-router': {
                singleton: true,
                requiredVersion: deps['react-router'],
                eager: true,
              },
              'react-router-dom': {
                singleton: true,
                requiredVersion: deps['react-router-dom'],
                eager: true,
              },
              '@patternfly/react-core': {
                singleton: true,
                requiredVersion: deps['@patternfly/react-core'],
              },
              '@openshift/dynamic-plugin-sdk': {
                singleton: true,
                requiredVersion: deps['@openshift/dynamic-plugin-sdk'],
                eager: true,
              },
              '@odh-dashboard/plugin-core': {
                singleton: true,
                requiredVersion: deps['@odh-dashboard/plugin-core'],
                eager: true,
              },
            },
            exposes: {},
            dts: updateTypes,
          }),
        ]
      : [],
};

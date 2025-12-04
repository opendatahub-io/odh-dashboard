const { execSync } = require('child_process');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

const updateTypes = !!process.env.MF_UPDATE_TYPES;

/**
 * Check if a config is the old format by checking for `remoteEntry` at the top level.
 * @param {Object} config
 * @returns {boolean}
 */
const isOldConfig = (config) => 'remoteEntry' in config;

/**
 * Converts a deprecated old config to the newer format.
 * @param {Object} oldConfig
 * @returns {Object}
 */
const convertModuleFederationConfig = (oldConfig) => {
  const { name, remoteEntry, authorize, local, service, proxy, tls } = oldConfig;

  const normalizedService = {
    name: service.name,
    namespace: service.namespace ?? process.env.OC_PROJECT ?? '',
    port: service.port,
  };

  return {
    name,
    backend: {
      remoteEntry,
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(tls !== undefined && { tls }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    },
    proxyService: (proxy ?? []).map((p) => ({
      path: p.path,
      ...(p.pathRewrite && { pathRewrite: p.pathRewrite }),
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    })),
  };
};

/**
 * Normalizes a config to the new format, converting from old format if necessary.
 * @param {Object} config
 * @returns {Object}
 */
const normalizeConfig = (config) =>
  isOldConfig(config) ? convertModuleFederationConfig(config) : config;

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
        configs.push(normalizeConfig(federatedConfigProperty));
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
      const configs = JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
      return configs.map(normalizeConfig);
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
                  if (!config.backend) {
                    return acc;
                  }
                  const { localService, remoteEntry, service } = config.backend;
                  const host = localService?.host ?? 'localhost';
                  const port = localService?.port ?? service.port;
                  acc[`@mf/${config.name}`] = `${config.name}@http://${host}:${port}${remoteEntry}`;
                  return acc;
                }, {})
              : undefined,
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

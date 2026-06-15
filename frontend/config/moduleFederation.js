const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { getRuntimeOdhPackages } = require('./getRuntimeOdhPackages');
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

const odhDashboardShared = Object.fromEntries(
  [...getRuntimeOdhPackages(workspacePackages, require('../src/package.json'))].map((name) => [
    name,
    { singleton: true, requiredVersion: '*', eager: true },
  ]),
);

/**
 * Scan packages/* directories for module-federation configs.
 * This catches packages not in the root npm workspace (standalone frontends).
 * @returns {Array} Array of normalized MF config objects
 */
const readModuleFederationConfigFromFilesystem = () => {
  const configs = [];
  const packagesDir = path.resolve(__dirname, '../../packages');

  try {
    const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) {
        continue;
      }
      const pkgJsonPath = path.join(packagesDir, dir.name, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) {
        continue;
      }
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkgJson['module-federation']) {
          configs.push(normalizeConfig(pkgJson['module-federation']));
        }
      } catch {
        // skip unreadable package.json
      }
    }
  } catch (e) {
    console.warn('Failed to scan packages/ for module federation configs:', e.message);
  }

  return configs;
};

/**
 * Read BFF port configuration from packages/* directories.
 * @returns {Object} Map of { [mfName]: { bffPort, dir } }
 */
const readBffPortsFromPackages = () => {
  const ports = {};
  const packagesDir = path.resolve(__dirname, '../../packages');

  try {
    const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) {
        continue;
      }
      const pkgJsonPath = path.join(packagesDir, dir.name, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) {
        continue;
      }
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const mfConfig = pkgJson['module-federation'];
        const { bffConfig } = pkgJson;
        if (mfConfig && bffConfig?.port) {
          const name = mfConfig.name || mfConfig.backend?.name;
          if (name) {
            ports[name] = { bffPort: bffConfig.port, dir: dir.name };
          }
        }
      } catch {
        // skip
      }
    }
  } catch (e) {
    console.warn('Failed to scan packages/ for BFF ports:', e.message);
  }

  return ports;
};

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

  // Also scan filesystem for packages not in the root npm workspace
  const fsConfigs = readModuleFederationConfigFromFilesystem();
  const existingNames = new Set(configs.map((c) => c.name));
  for (const config of fsConfigs) {
    if (!existingNames.has(config.name)) {
      configs.push(config);
    }
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

const moduleBffPorts = readBffPortsFromPackages();

module.exports = {
  moduleFederationConfig: mfConfig,
  moduleBffPorts,
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
              '@patternfly/react-code-editor': {
                singleton: true,
                requiredVersion: deps['@patternfly/react-code-editor'],
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
              '@openshift/dynamic-plugin-sdk-utils': {
                singleton: true,
                requiredVersion: deps['@openshift/dynamic-plugin-sdk-utils'],
                eager: true,
              },
              'use-query-params': { singleton: true, requiredVersion: '^2.2.1' },
              '@tanstack/react-query': { singleton: true, requiredVersion: '^4.36.1' },
              ...odhDashboardShared,
            },
            exposes: {},
            dts: updateTypes,
          }),
        ]
      : [],
};

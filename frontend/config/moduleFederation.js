const fs = require('fs');
const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

const updateTypes = !!process.env.MF_UPDATE_TYPES;

// Function to read module federation config from package.json files
const readModuleFederationConfigFromPackages = () => {
  const packagesBasePath = path.resolve(__dirname, '../packages');
  const configs = [];

  try {
    if (fs.existsSync(packagesBasePath)) {
      const packageFolders = fs
        .readdirSync(packagesBasePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const folderName of packageFolders) {
        const packageJsonPath = path.join(packagesBasePath, folderName, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            const federatedConfigProperty = packageJson['module-federation'];
            if (federatedConfigProperty) {
              configs.push(federatedConfigProperty);
            }
          } catch (e) {
            console.error(`Failed to read or parse ${packageJsonPath}.`, e);
          }
        }
      }
    }
  } catch (e) {
    console.error(
      `Failed to read packages directory ${packagesBasePath} or process its contents for module federation.`,
      e,
    );
  }

  return configs;
};

const getModuleFederationConfig = () => {
  if (process.env.MODULE_FEDERATION_CONFIG) {
    try {
      return JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    } catch (e) {
      console.log.error('Failed to parse module federation config from ENV', e);
    }
  } else {
    // read the module federation config from the package.json files
    return readModuleFederationConfigFromPackages();
  }
  return [];
};

const mfConfig = getModuleFederationConfig();
if (mfConfig.length > 0) {
  console.log('Federated modules:', mfConfig.map((c) => c.name).join(', '));
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
              react: { singleton: true, requiredVersion: deps.react },
              'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
              'react-router': {
                singleton: true,
                requiredVersion: deps['react-router'],
              },
              'react-router-dom': {
                singleton: true,
                requiredVersion: deps['react-router-dom'],
              },
              '@patternfly/react-core': {
                requiredVersion: deps['@patternfly/react-core'],
              },
              '@patternfly/react-icons': {
                requiredVersion: deps['@patternfly/react-icons'],
              },
              '@odh-dashboard/plugin-core': {
                singleton: true,
                requiredVersion: '0.0.0',
              },
            },
            exposes: {},
            dts: updateTypes,
          }),
        ]
      : [],
};

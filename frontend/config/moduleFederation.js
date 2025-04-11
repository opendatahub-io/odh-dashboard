const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

const updateTypes = !!process.env.MF_UPDATE_TYPES;
let mfConfig = [];
if (process.env.MODULE_FEDERATION_CONFIG) {
  try {
    mfConfig = JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    console.log('Federated modules:', mfConfig.map((c) => c.name).join(', '));
  } catch (e) {
    console.error('Failed to parse module federation config', e);
  }
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
              react: { singleton: true, eager: true, requiredVersion: deps.react },
              'react-dom': { singleton: true, eager: true, requiredVersion: deps['react-dom'] },
              'react-router': {
                singleton: true,
                eager: true,
                requiredVersion: deps['react-router'],
              },
              'react-router-dom': {
                singleton: true,
                eager: true,
                requiredVersion: deps['react-router-dom'],
              },
            },
            exposes: {},
            dts: updateTypes,
          }),
        ]
      : [],
};

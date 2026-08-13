const { OdhRemoteFederationPlugin } = require('@odh-dashboard/app-config/webpack');

const packageJson = require('../package.json');

const pfReactIconsRequiredVersion = packageJson.dependencies['@patternfly/react-icons'];
let pfReactIconsVersion;
try {
  const installed = require('@patternfly/react-icons/package.json').version;
  pfReactIconsVersion = typeof installed === 'string' ? installed : undefined;
} catch {
  pfReactIconsVersion = pfReactIconsRequiredVersion.replace(/^[\^~]/, '');
}

module.exports = {
  moduleFederationPlugins: [
    new OdhRemoteFederationPlugin({
      name: 'autorag',
      packageJson,
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
      shared: {
        // RHDS custom icons use createIcon deep import — share explicitly (not covered by @patternfly/react-icons root).
        '@patternfly/react-icons/dist/esm/createIcon': {
          singleton: true,
          requiredVersion: pfReactIconsRequiredVersion,
          ...(pfReactIconsVersion && { version: pfReactIconsVersion }),
        },
      },
    }),
  ],
};

// Using manual MF config instead of OdhRemoteFederationPlugin to avoid import:false
// on ODH singleton packages. OdhRemoteFederationPlugin adds import:false for
// host-provided packages, which breaks cross-bundler (rspack host → webpack remote)
// singleton resolution — plugin-core's DashboardConfigContext ends up as null.
// Tracking issue: the loadShareSync cascade makes eager:true on the host unworkable
// without also making @patternfly/react-icons eager. Using singleton:true without
// import:false lets the remote bundle its own fallback and resolve to the host's
// singleton at runtime, which works across bundler boundaries.
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('../package.json').dependencies;

module.exports = {
  moduleFederationPlugins: [
    new ModuleFederationPlugin({
      name: 'genAi',
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
        '@openshift/dynamic-plugin-sdk': { singleton: true },
        '@openshift/dynamic-plugin-sdk-utils': { singleton: true },
        '@odh-dashboard/plugin-core': { singleton: true, requiredVersion: '*' },
        '@odh-dashboard/ui-core': { singleton: true, requiredVersion: '*' },
        '@odh-dashboard/internal': { singleton: true, requiredVersion: '*' },
        '@odh-dashboard/k8s-core': { singleton: true, requiredVersion: '*' },
        '@odh-dashboard/foundation': { singleton: true, requiredVersion: '*' },
      },
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
        './EmbeddableChatbotPlayground': './src/app/Chatbot/EmbeddableChatbotPlayground',
      },
      runtime: false,
      dts: false,
    }),
  ],
};

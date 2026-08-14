const { OdhHostFederationPlugin } = require('./OdhHostFederationPlugin.ts');
const { OdhRemoteFederationPlugin } = require('./OdhRemoteFederationPlugin.ts');
const { sharedPluginModules, getSharedModuleMetadata } = require('./shared-modules-meta.ts');
const { getRuntimeOdhPackages } = require('./getRuntimeOdhPackages.ts');

export type { OdhHostFederationPluginOptions } from './OdhHostFederationPlugin.ts';
export type { OdhRemoteFederationPluginOptions } from './OdhRemoteFederationPlugin.ts';

module.exports = {
  OdhHostFederationPlugin,
  OdhRemoteFederationPlugin,
  sharedPluginModules,
  getSharedModuleMetadata,
  getRuntimeOdhPackages,
};

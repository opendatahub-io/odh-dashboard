const { OdhHostFederationPlugin } = require('./OdhHostFederationPlugin.ts');
const { OdhRemoteFederationPlugin } = require('./OdhRemoteFederationPlugin.ts');
const {
  sharedPluginModules,
  getSharedModuleMetadata,
  PF_REACT_ICONS_CREATE_ICON_MODULE,
  getPfReactIconsCreateIconSharedConfig,
} = require('./shared-modules-meta.ts');
const { getRuntimeOdhPackages } = require('./getRuntimeOdhPackages.ts');

export type { OdhHostFederationPluginOptions } from './OdhHostFederationPlugin.ts';
export type { OdhRemoteFederationPluginOptions } from './OdhRemoteFederationPlugin.ts';

module.exports = {
  OdhHostFederationPlugin,
  OdhRemoteFederationPlugin,
  sharedPluginModules,
  getSharedModuleMetadata,
  PF_REACT_ICONS_CREATE_ICON_MODULE,
  getPfReactIconsCreateIconSharedConfig,
  getRuntimeOdhPackages,
};

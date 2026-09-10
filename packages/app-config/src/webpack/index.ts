const { OdhFederationPlugin } = require('./OdhFederationPlugin.ts');
const pnpmResolverIncludes = require('./pnpmResolverIncludes.js');

export type { OdhFederationPluginOptions } from './OdhFederationPlugin.ts';

module.exports = {
  OdhFederationPlugin,
  ...pnpmResolverIncludes,
};

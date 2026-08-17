import type { Compiler } from 'webpack';
import type { OdhRemoteFederationPluginOptions } from './BaseOdhRemoteFederationPlugin.ts';
import type { ModuleFederationPluginClass } from './BaseOdhHostFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { BaseOdhRemoteFederationPlugin } = require('./BaseOdhRemoteFederationPlugin.ts');

export type { OdhRemoteFederationPluginOptions };

/**
 * Remote webpack plugin that registers ModuleFederationPlugin with:
 * - Forced shared modules (import: false for host-provided packages)
 * - runtime: false
 *
 * Usage:
 *   new OdhRemoteFederationPlugin({ name: 'maas', packageJson, exposes })
 */
class OdhRemoteFederationPlugin extends BaseOdhRemoteFederationPlugin<Compiler> {
  protected getModuleFederationPlugin(): ModuleFederationPluginClass<Compiler> {
    return ModuleFederationPlugin;
  }
}

module.exports = {
  OdhRemoteFederationPlugin,
};

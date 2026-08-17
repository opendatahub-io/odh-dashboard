import type { Compiler } from '@rspack/core';
import type { OdhRemoteFederationPluginOptions } from '../webpack/BaseOdhRemoteFederationPlugin.ts';
import type { ModuleFederationPluginClass } from '../webpack/BaseOdhHostFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const { BaseOdhRemoteFederationPlugin } = require('../webpack/BaseOdhRemoteFederationPlugin.ts');

export type { OdhRemoteFederationPluginOptions };

/**
 * Remote rspack plugin that registers ModuleFederationPlugin with:
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

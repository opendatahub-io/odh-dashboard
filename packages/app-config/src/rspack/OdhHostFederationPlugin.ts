import type { Compiler } from '@rspack/core';
import type {
  ModuleFederationPluginClass,
  OdhHostFederationPluginOptions,
} from '../webpack/BaseOdhHostFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const { BaseOdhHostFederationPlugin } = require('../webpack/BaseOdhHostFederationPlugin.ts');

export type { OdhHostFederationPluginOptions };

/**
 * Host rspack plugin that registers ModuleFederationPlugin with the canonical
 * shared-module policy.
 *
 * Usage:
 *   new OdhHostFederationPlugin({ packageJson: require('../package.json') })
 */
class OdhHostFederationPlugin extends BaseOdhHostFederationPlugin<Compiler> {
  protected getModuleFederationPlugin(): ModuleFederationPluginClass<Compiler> {
    return ModuleFederationPlugin;
  }
}

module.exports = {
  OdhHostFederationPlugin,
};

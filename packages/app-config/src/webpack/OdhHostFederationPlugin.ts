import type { Compiler } from 'webpack';
import type {
  ModuleFederationPluginClass,
  OdhHostFederationPluginOptions,
} from './BaseOdhHostFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { BaseOdhHostFederationPlugin } = require('./BaseOdhHostFederationPlugin.ts');

export type { OdhHostFederationPluginOptions };

/**
 * Host webpack plugin that registers ModuleFederationPlugin with the canonical
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

import type { Compiler } from '@rspack/core';
import type {
  ModuleFederationPluginClass,
  OdhFederationPluginOptions,
} from '../webpack/BaseOdhFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const { BaseOdhFederationPlugin } = require('../webpack/BaseOdhFederationPlugin.ts');

export type { OdhFederationPluginOptions };

/**
 * Rspack Module Federation plugin for host and remote builds.
 *
 * Usage:
 *   new OdhFederationPlugin({ name: 'host', isHost: true, remotes, dts })
 *   new OdhFederationPlugin({ name: 'maas', isHost: process.env.DEPLOYMENT_MODE === 'standalone', exposes })
 */
class OdhFederationPlugin extends BaseOdhFederationPlugin<Compiler> {
  protected getModuleFederationPlugin(): ModuleFederationPluginClass<Compiler> {
    return ModuleFederationPlugin;
  }
}

module.exports = {
  OdhFederationPlugin,
};

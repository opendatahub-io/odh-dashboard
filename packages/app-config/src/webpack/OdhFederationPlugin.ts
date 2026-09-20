import type { Compiler } from 'webpack';
import type {
  ModuleFederationPluginClass,
  OdhFederationPluginOptions,
} from './BaseOdhFederationPlugin.ts';

const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { BaseOdhFederationPlugin } = require('./BaseOdhFederationPlugin.ts');

export type { OdhFederationPluginOptions };

/**
 * Webpack Module Federation plugin for host and remote builds.
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

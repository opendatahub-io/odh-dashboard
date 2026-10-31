const { OdhFederationPlugin } = require('./OdhFederationPlugin.ts');

export type { OdhFederationPluginOptions } from './OdhFederationPlugin.ts';

/**
 * Shared LightningCSS minimizer options for production rspack builds.
 *
 * rspack's LightningCssMinimizerRspackPlugin defaults to `targets: ['fully
 * supports es6']` — a baseline without CSS logical properties — so it lowers
 * every padding-inline-* / margin-inline-* / inset-inline-* into physical
 * values plus :lang() RTL fallback pairs. The lowered selectors carry enough
 * specificity to beat PatternFly's contextual overrides (card titles inside
 * card headers regain 24px of padding in production builds only; dev builds
 * do not run the minimizer, so the drift is invisible locally).
 *
 * PR Build Validation guards emitted CSS for the lowered `:lang(ae)`
 * selectors; see RHOAIENG-100835.
 */
const lightningCssMinimizerOptions = Object.freeze({
  exclude: { logicalProperties: true },
});

module.exports = {
  OdhFederationPlugin,
  lightningCssMinimizerOptions,
};

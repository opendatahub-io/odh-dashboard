export type SharedModuleMetadata = {
  singleton: boolean;
  allowFallback: boolean;
  eager: boolean;
};

const defaultMeta: SharedModuleMetadata = {
  singleton: true,
  allowFallback: true,
  eager: false,
};

/**
 * Modules that are always shared as singletons between the host and all remotes.
 *
 * - `allowFallback: false` + `eager: true` — core framework modules that MUST come
 *   from the host. Multiple instances break React hooks, routing, or query state.
 * - `allowFallback: true` (default) — remotes may bundle their own copy as fallback.
 *   At runtime, if the host provides a compatible version, that wins (singleton).
 *   Otherwise the remote's bundled copy is used.
 */
const sharedPluginModules: Record<string, Partial<SharedModuleMetadata>> = {
  react: { eager: true, allowFallback: false },
  'react-dom': { eager: true, allowFallback: false },
  'react-router': { eager: true, allowFallback: false },
  'react-router-dom': { eager: true, allowFallback: false },

  '@openshift/dynamic-plugin-sdk': { eager: true, allowFallback: false },
  '@openshift/dynamic-plugin-sdk-utils': { eager: true, allowFallback: false },

  '@patternfly/chatbot': {},
  '@patternfly/quickstarts': {},
  '@patternfly/react-catalog-view-extension': {},
  '@patternfly/react-charts': {},
  // Eager in the host so the host copies win same-version singleton ties (the MF runtime
  // otherwise picks the provider with the greatest container name, e.g. `maas`). The host
  // configures this loader at startup; a remote copy would bring its own unconfigured loader,
  // which falls back to the CDN AMD loader and breaks UMD modules (RHAI-20772).
  '@patternfly/react-code-editor': { eager: true },
  '@monaco-editor/react': { eager: true },
  '@patternfly/react-component-groups': {},
  '@patternfly/react-core': { eager: true, allowFallback: false },
  '@patternfly/react-drag-drop': {},
  '@patternfly/react-icons': {},
  '@patternfly/react-log-viewer': {},
  '@patternfly/react-styles': { eager: true, allowFallback: false },
  '@patternfly/react-table': {},
  '@patternfly/react-templates': {},
  '@patternfly/react-tokens': {},
  '@patternfly/react-topology': {},
};

const getSharedModuleMetadata = (moduleName: string): SharedModuleMetadata => {
  const overrides = sharedPluginModules[moduleName] ?? {};
  return { ...defaultMeta, ...overrides };
};

module.exports = {
  sharedPluginModules,
  getSharedModuleMetadata,
};

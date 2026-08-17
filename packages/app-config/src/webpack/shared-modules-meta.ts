export type SharedModuleMetadata = {
  singleton: boolean;
  allowFallback: boolean;
  eager: boolean;
};

/** Deep import used by RHDS vendored icons; not covered by `@patternfly/react-icons` root sharing. */
const PF_REACT_ICONS_CREATE_ICON_MODULE = '@patternfly/react-icons/dist/esm/createIcon';

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
  '@patternfly/react-code-editor': {},
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

/** Shared MF config for the createIcon deep import when `@patternfly/react-icons` is a dependency. */
const getPfReactIconsCreateIconSharedConfig = (
  pfReactIconsRequiredVersion: string,
): Record<string, unknown> => {
  let version: string | undefined;
  try {
    const installed = require('@patternfly/react-icons/package.json').version;
    version = typeof installed === 'string' ? installed : undefined;
  } catch {
    // Metadata unavailable; do not derive version from the requiredVersion range.
  }
  return {
    singleton: true,
    requiredVersion: pfReactIconsRequiredVersion,
    ...(version && { version }),
  };
};

module.exports = {
  sharedPluginModules,
  getSharedModuleMetadata,
  PF_REACT_ICONS_CREATE_ICON_MODULE,
  getPfReactIconsCreateIconSharedConfig,
};

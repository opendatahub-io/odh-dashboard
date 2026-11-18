// Host-only entry point: pulls in @module-federation/runtime, so it is kept out of the
// root export that every federated remote imports.
export * from './ExtensibilityContext';
export * from './useAppExtensions';

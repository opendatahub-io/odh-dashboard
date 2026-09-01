/** mod-arch-core key used by useNamespacePersistence when storeLastNamespace is enabled */
export const GEN_AI_NAMESPACE_STORAGE_KEY = 'mod-arch.namespace.lastUsed';

/** Clear persisted namespace before the app boots so route namespace wins over stale storage. */
export const clearGenAiNamespacePersistence = (win: Window): void => {
  win.localStorage.removeItem(GEN_AI_NAMESPACE_STORAGE_KEY);
};

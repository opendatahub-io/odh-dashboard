/**
 * Utility for sharing preferred project state across federated modules.
 *
 * Problem: React contexts don't work across Module Federation boundaries.
 * ODH's ProjectsContext and federated modules (gen-ai, maas, model-registry)
 * each have their own React context instances, so they can't share state directly.
 *
 * Solution: Use sessionStorage as a bridge to share the preferred project.
 * - ODH writes to sessionStorage when the preferred project changes
 * - Federated modules read from sessionStorage when they need the preferred project
 * - Federated modules write back to sessionStorage when they change the project
 *
 * Why sessionStorage over localStorage:
 * - Clears when the browser session ends (avoids stale data)
 * - Persists during navigation within the same session
 * - Scoped to the current browsing session
 */

export const PREFERRED_PROJECT_STORAGE_KEY = 'odh.dashboard.preferredProject';

/**
 * Get the preferred project name from sessionStorage.
 * Returns null if no preferred project is set.
 */
export const getPreferredProject = (): string | null =>
  sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY);

/**
 * Set the preferred project name in sessionStorage.
 * Call this when the user selects a project.
 */
export const setPreferredProject = (projectName: string): void => {
  sessionStorage.setItem(PREFERRED_PROJECT_STORAGE_KEY, projectName);
};

/**
 * Clear the preferred project from sessionStorage.
 * Call this when the user logs out or when the project is deleted.
 */
export const clearPreferredProject = (): void => {
  sessionStorage.removeItem(PREFERRED_PROJECT_STORAGE_KEY);
};

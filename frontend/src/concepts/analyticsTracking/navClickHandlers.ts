/**
 * Registry for nav item click handlers.
 *
 * Packages register callbacks keyed by the nav extension `id`.
 * NavItemHref invokes the registered handler (if any) when clicked.
 *
 * Uses window-level storage so that cross-package imports sharing the
 * same logical module are guaranteed to reference the same Map instance
 * regardless of how webpack resolves their import paths.
 */

declare global {
  interface Window {
    __navClickHandlers?: Map<string, () => void>;
  }
}

const getHandlers = (): Map<string, () => void> => {
  if (!window.__navClickHandlers) {
    window.__navClickHandlers = new Map();
  }
  return window.__navClickHandlers;
};

const navClickHandlers = {
  set: (id: string, handler: () => void): void => {
    getHandlers().set(id, handler);
  },
  get: (id: string): (() => void) | undefined => getHandlers().get(id),
};

export default navClickHandlers;

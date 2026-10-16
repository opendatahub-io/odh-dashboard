import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Keeps the host's react-router in sync with URL changes made by the
 * federated MLflow remote's own (separate, v6) BrowserRouter instance.
 *
 * The remote navigates via its own history object, which updates
 * `window.location` via `pushState`/`replaceState` but fires no event the
 * host's router listens for -- the two router instances don't know about
 * each other. Without this, the host never re-evaluates which top-level
 * route/component should be mounted (e.g. switching between the tabbed
 * list view and the full-screen server detail breakout) even though the
 * visible URL has already changed.
 *
 * Pass the returned function as the wrapper's `onBreadcrumbChange` prop --
 * the remote already calls it on every internal navigation, so it doubles
 * as a reliable "the URL may have changed under you" signal.
 */
const useHostRouteSync = (): (() => void) => {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(() => {
    const target = `${window.location.pathname}${window.location.search}`;
    const current = `${location.pathname}${location.search}`;
    if (target !== current) {
      navigate(target, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
};

export default useHostRouteSync;

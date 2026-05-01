import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Like useEffect, but skips the callback when the dependency values haven't
 * changed from their previous invocation.  On the very first invocation (mount)
 * there is no previous snapshot, so the callback is always skipped.
 *
 * This exists primarily for the **reconfigure flow**: when a user reconfigures
 * a completed experiment the configure form is pre-populated with values from
 * the original run (e.g. secret, bucket, file key, source mode).  Several
 * effects need to reset downstream state (clear the file key, cancel uploads,
 * etc.) whenever those values change — but running those resets on mount would
 * immediately wipe out the pre-populated values before the user sees them.
 *
 * **React StrictMode considerations:**
 * In development, React 18 StrictMode double-mounts every component (mount →
 * unmount → remount) to surface side-effect bugs.  A naïve boolean
 * `hasMountedRef` flag breaks under this: the flag is set to `true` during the
 * first mount's effect, the ref survives the simulated unmount (no cleanup
 * resets it), and when the remount effect fires the flag is already `true` so
 * the callback executes — wiping pre-populated form values.
 *
 * This hook avoids that by comparing **dependency values** instead of tracking
 * a mount count.  On the StrictMode remount the deps are still identical to the
 * first mount, so `Object.is` confirms nothing changed and the callback is
 * skipped.  Only a genuine value change (user interaction, async load, etc.)
 * will pass the comparison and fire the callback.
 *
 * Using this hook instead of raw useEffect makes the "skip mount" intent
 * explicit and eliminates the need for per-effect prev-value refs.
 */
const useReconfigureSafeEffect = (callback: () => void, deps: DependencyList): void => {
  const prevDepsRef = useRef<DependencyList | undefined>(undefined);

  useEffect(() => {
    const prevDeps = prevDepsRef.current;
    prevDepsRef.current = deps;

    // Skip on mount (no previous snapshot) or when values are unchanged
    // (handles React StrictMode double-mount where effects fire twice with
    // identical values).
    if (!prevDeps || prevDeps.every((prev, i) => Object.is(prev, deps[i]))) {
      return;
    }

    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useReconfigureSafeEffect;

import React from 'react';
import { init, loadRemote, registerRemotes } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { allSettledPromises } from '../core/allSettledPromises';

export type AppExtensions = Record<string, Extension[]>;

type MFConfig = {
  name: string;
  remoteEntry: string;
};

const EMPTY_EXTENSIONS: AppExtensions = {};

/**
 * Resolves an entry URL the way the federation runtime does when it registers a remote:
 * in the browser, entries not starting with `http` are made absolute against the page
 * origin. Registered remotes hold the resolved URL, so comparisons must use it too.
 */
const resolveEntryUrl = (entry: string): string =>
  typeof window !== 'undefined' && !entry.startsWith('http')
    ? new URL(entry, window.location.origin).href
    : entry;

const initRemotes = (remotes: MFConfig[]) => {
  const registered = init({ name: 'app', remotes: [] }).options.remotes;
  const changed = remotes
    .map(({ name, remoteEntry }) => ({ name, entry: `/_mf/${name}${remoteEntry}` }))
    .filter(
      ({ name, entry }) =>
        !registered.some(
          (remote) =>
            remote.name === name &&
            'entry' in remote &&
            resolveEntryUrl(remote.entry) === resolveEntryUrl(entry),
        ),
    );
  if (changed.length > 0) {
    // `init` never replaces a remote that is already registered, so a changed entry URL
    // would keep serving the old module. `force` swaps the registration and drops its
    // cached module; remotes whose entry did not change keep theirs.
    registerRemotes(changed, { force: true });
  }
};

const loadModuleExtensions = (moduleName: string): Promise<AppExtensions> =>
  loadRemote<{ default: Extension[] }>(`${moduleName}/extensions`)
    .then((result) => {
      if (Array.isArray(result?.default)) {
        return { [moduleName]: result.default };
      }
      // eslint-disable-next-line no-console
      console.warn(`Module ${moduleName} does not export an extensions array; ignoring it.`);
      return { [moduleName]: [] };
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load module extensions for ${moduleName}:`, error);
      return { [moduleName]: [] };
    });

type RemoteState = {
  /** The `mfRemotes` value these results were loaded for. */
  forRemotes: string;
  extensions: AppExtensions;
};

const loadRemoteExtensions = (mfRemotes: string): Promise<AppExtensions> => {
  let remotes: MFConfig[];
  try {
    remotes = JSON.parse(mfRemotes);
    if (remotes.length === 0) {
      return Promise.resolve({});
    }
    initRemotes(remotes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Error with module federation setup:', error);
    return Promise.resolve({});
  }
  return allSettledPromises(remotes.map((r) => loadModuleExtensions(r.name)))
    .then(([results]) => results.reduce<AppExtensions>((acc, r) => ({ ...acc, ...r.value }), {}))
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('Error loading module federation extensions:', error);
      return {};
    });
};

/**
 * Collects the extensions of a host application: the statically bundled ones plus
 * any loaded at runtime from Module Federation remotes.
 *
 * @param staticExtensions Extensions bundled into the host, keyed by plugin name.
 *   Pass a stable reference (module constant or memoized value).
 * @param mfRemotes JSON array of `{ name, remoteEntry }` remotes to load. When omitted
 *   or empty, only the static extensions are returned and loading completes immediately.
 *   When it changes, the previous remote extensions are dropped, `loaded` is `false` until
 *   the new set has loaded, and results from superseded loads are ignored.
 * @returns `[extensions, loaded]`
 */
export const useAppExtensions = (
  staticExtensions: AppExtensions = EMPTY_EXTENSIONS,
  mfRemotes?: string | null,
): [AppExtensions, boolean] => {
  const [remoteState, setRemoteState] = React.useState<RemoteState | null>(null);

  React.useEffect(() => {
    // Drop results of the previous configuration, so returning to a configuration loaded
    // earlier (A -> none -> A) waits for the fresh load instead of reusing the old results.
    setRemoteState(null);
    if (!mfRemotes) {
      return undefined;
    }
    let superseded = false;
    loadRemoteExtensions(mfRemotes).then((extensions) => {
      if (!superseded) {
        setRemoteState({ forRemotes: mfRemotes, extensions });
      }
    });
    return () => {
      superseded = true;
    };
  }, [mfRemotes]);

  // Only results loaded for the current configuration count; this also covers the render
  // between a configuration change and the effect above clearing the old results.
  const currentRemoteExtensions =
    mfRemotes && remoteState?.forRemotes === mfRemotes ? remoteState.extensions : null;
  const loaded = !mfRemotes || currentRemoteExtensions !== null;

  const allExtensions = React.useMemo(
    () =>
      currentRemoteExtensions
        ? { ...staticExtensions, ...currentRemoteExtensions }
        : staticExtensions,
    [staticExtensions, currentRemoteExtensions],
  );

  return [allExtensions, loaded];
};

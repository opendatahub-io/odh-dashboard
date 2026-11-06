import React from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { allSettledPromises } from '../core/allSettledPromises';

export type AppExtensions = Record<string, Extension[]>;

type MFConfig = {
  name: string;
  remoteEntry: string;
};

const EMPTY_EXTENSIONS: AppExtensions = {};

const initRemotes = (remotes: MFConfig[]) => {
  init({
    name: 'app',
    remotes: remotes.map(({ name, remoteEntry }) => ({
      name,
      entry: `/_mf/${name}${remoteEntry}`,
    })),
  });
};

const loadModuleExtensions = (moduleName: string): Promise<AppExtensions> =>
  loadRemote<{ default: Extension[] }>(`${moduleName}/extensions`)
    .then((result) => ({
      [moduleName]: result ? result.default : [],
    }))
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

  // Only results loaded for the current configuration count.
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

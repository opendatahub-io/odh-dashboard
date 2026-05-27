import React from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';

// TODO: Dedup — this hook is adapted from frontend/src/plugins/useAppExtensions.ts.
// Key differences: no static pluginExtensions, local settleAll instead of allSettledPromises.
// Consider moving the shared MF loading logic to plugin-core.
declare const MF_REMOTES: string;

type MFConfig = {
  name: string;
  remoteEntry: string;
};

const initRemotes = (remotes: MFConfig[]): void => {
  init({
    name: 'host',
    remotes: remotes.map(({ name, remoteEntry }) => ({
      name,
      entry: `/_mf/${name}${remoteEntry}`,
    })),
  });
};

const loadModuleExtensions = (moduleName: string): Promise<Record<string, Extension[]>> =>
  loadRemote<{ default: Extension[] }>(`${moduleName}/extensions`)
    .then((result) => ({
      [moduleName]: result ? result.default : [],
    }))
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load module extensions for ${moduleName}:`, error);
      return { [moduleName]: [] };
    });

const settleAll = <T>(promises: Promise<T>[]): Promise<{ fulfilled: T[]; rejected: unknown[] }> =>
  Promise.all(
    promises.map((p) =>
      p
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch((reason) => ({ status: 'rejected' as const, reason })),
    ),
  ).then((results) => ({
    fulfilled: results
      .filter((r): r is { status: 'fulfilled'; value: T } => r.status === 'fulfilled')
      .map((r) => r.value),
    rejected: results
      .filter((r): r is { status: 'rejected'; reason: unknown } => r.status === 'rejected')
      .map((r) => r.reason),
  }));

let remotesInitialised = false;

const tryInitRemotes = (remotes: MFConfig[]): void => {
  if (!remotesInitialised) {
    try {
      initRemotes(remotes);
      remotesInitialised = true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Module federation init failed, will retry on next mount:', error);
    }
  }
};

export const useAppExtensions = (): [Record<string, Extension[]>, boolean] => {
  const [appExtensions, setAppExtensions] = React.useState<Record<string, Extension[]>>({});
  const [loaded, setLoaded] = React.useState(!MF_REMOTES || MF_REMOTES === '[]');

  React.useEffect(() => {
    let cancelled = false;

    if (MF_REMOTES && MF_REMOTES !== '[]') {
      try {
        const remotes: MFConfig[] = JSON.parse(MF_REMOTES);
        if (remotes.length > 0) {
          tryInitRemotes(remotes);
          settleAll(remotes.map((r) => loadModuleExtensions(r.name)))
            .then(({ fulfilled }) => {
              if (!cancelled && fulfilled.length > 0) {
                setAppExtensions((prev) =>
                  fulfilled.reduce((acc, r) => ({ ...acc, ...r }), { ...prev }),
                );
              }
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.warn('Error loading module federation extensions:', error);
            })
            .finally(() => {
              if (!cancelled) {
                setLoaded(true);
              }
            });
        } else {
          setLoaded(true);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error with module federation setup:', error);
        setLoaded(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return [appExtensions, loaded];
};

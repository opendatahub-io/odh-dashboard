import React from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import { fetchDashboardConfig } from '#~/services/dashboardConfigService';
import { MF_REMOTES } from '#~/utilities/const';
import pluginExtensions from './plugin-extensions';

type MFConfig = {
  name: string;
  remoteEntry: string;
};

const DEV_FEATURE_FLAGS_QUERY_PARAM = 'devFeatureFlags';
const DEV_FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';
const AUTORAG_MODULE_NAME = 'autorag';

// static extensions
export const extensionDeclarations = { ...pluginExtensions };

const initRemotes = (remotes: MFConfig[]) => {
  init({
    name: 'app',
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

const getDevAutoRagOverride = (): boolean | undefined => {
  const queryFlags = new URLSearchParams(window.location.search).get(DEV_FEATURE_FLAGS_QUERY_PARAM);

  if (queryFlags != null) {
    if (queryFlags === 'true') {
      return true;
    }
    if (queryFlags === 'false') {
      return false;
    }

    const autoragFlag = queryFlags.split(',').find((flag) => flag.split('=')[0] === 'autorag');
    return autoragFlag == null ? undefined : autoragFlag.split('=')[1] === 'true';
  }

  try {
    const sessionFlags = sessionStorage.getItem(DEV_FEATURE_FLAGS_SESSION_KEY);
    if (sessionFlags != null) {
      const parsedFlags = JSON.parse(sessionFlags);
      if (
        typeof parsedFlags === 'object' &&
        parsedFlags !== null &&
        'autorag' in parsedFlags &&
        typeof parsedFlags.autorag === 'boolean'
      ) {
        return parsedFlags.autorag;
      }
    }
  } catch {
    // Ignore unavailable or invalid session storage and use the cluster configuration.
  }

  return undefined;
};

export const filterDisabledAutoRagRemote = (
  remotes: MFConfig[],
  autoragEnabled: boolean,
): MFConfig[] =>
  autoragEnabled ? remotes : remotes.filter(({ name }) => name !== AUTORAG_MODULE_NAME);

export const useAppExtensions = (): [Record<string, Extension[]>, boolean] => {
  const [appExtensions, setAppExtensions] = React.useState<Record<string, Extension[]>>({});
  const [loaded, setLoaded] = React.useState(!MF_REMOTES);

  React.useEffect(() => {
    if (MF_REMOTES) {
      try {
        const remotes: MFConfig[] = JSON.parse(MF_REMOTES);
        if (remotes.length > 0) {
          const loadExtensions = async () => {
            let activeRemotes = remotes;
            if (remotes.some(({ name }) => name === AUTORAG_MODULE_NAME)) {
              try {
                const config = await fetchDashboardConfig();
                const devOverride = getDevAutoRagOverride();
                const autoragEnabled = devOverride ?? config.spec.dashboardConfig.autorag ?? true;
                activeRemotes = filterDisabledAutoRagRemote(remotes, autoragEnabled);
              } catch (error) {
                // Preserve the current startup behavior if configuration cannot be fetched here.
                // The application performs its own config fetch and displays the corresponding error.
                // eslint-disable-next-line no-console
                console.warn('Failed to load dashboard config for module federation:', error);
              }
            }

            if (activeRemotes.length > 0) {
              initRemotes(activeRemotes);
              const [results] = await allSettledPromises(
                activeRemotes.map((r) => loadModuleExtensions(r.name)),
              );
              if (results.length > 0) {
                setAppExtensions((prev) =>
                  results.reduce((acc, r) => ({ ...acc, ...r.value }), { ...prev }),
                );
              }
            }
            setLoaded(true);
          };

          loadExtensions().catch((error) => {
            // eslint-disable-next-line no-console
            console.warn('Error loading module federation extensions:', error);
            setLoaded(true);
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
  }, []);

  const allExtensions = React.useMemo(
    () => ({ ...pluginExtensions, ...appExtensions }),
    [appExtensions],
  );

  return [allExtensions, loaded];
};

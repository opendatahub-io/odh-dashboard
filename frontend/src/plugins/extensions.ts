/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import modelServingExtensions from '@odh-dashboard/model-serving/extensions';
import kserveExtensions from '@odh-dashboard/kserve/extensions';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import { MF_CONFIG } from '#~/utilities/const';
import hardwareProfileExtensions from './extensions/hardware-profiles';
import navigationExtensions from './extensions/navigation';
import routeExtensions from './extensions/routes';

type MFConfig = {
  name: string;
  remoteEntry: string;
};

// static extensions
export const extensionDeclarations: Extension[] = [
  ...modelServingExtensions,
  ...kserveExtensions,
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
];

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
  loadRemote<{ default: Extension[] }>(`${moduleName}/extensions`).then((result) => ({
    [moduleName]: result ? result.default : [],
  }));

export const useAppExtensions = (): [Extension[], boolean] => {
  const [appExtensions, setAppExtensions] = React.useState<Record<string, Extension[]>>({});
  const [loaded, setLoaded] = React.useState(!MF_CONFIG);

  React.useEffect(() => {
    if (MF_CONFIG) {
      const remotes: MFConfig[] = JSON.parse(MF_CONFIG);
      try {
        if (remotes.length > 0) {
          initRemotes(remotes);
          allSettledPromises(remotes.map((r) => loadModuleExtensions(r.name)))
            .then(([results]) => {
              if (results.length > 0) {
                setAppExtensions((prev) =>
                  results.reduce((acc, r) => ({ ...acc, ...r.value }), { ...prev }),
                );
              }
            })
            .finally(() => setLoaded(true));
        } else {
          setLoaded(true);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing module federation config:', error);
        setLoaded(true);
      }
    }
  }, []);

  const allExtensions = React.useMemo(
    () => [...extensionDeclarations, ...Object.values(appExtensions).flat()],
    [appExtensions],
  );

  return [allExtensions, loaded];
};

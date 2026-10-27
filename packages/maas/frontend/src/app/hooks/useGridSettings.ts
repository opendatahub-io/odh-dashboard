import * as React from 'react';
import { ConfigSettings, UserSettings, fetchConfig, useDeepCompareMemoize } from 'mod-arch-core';
import { getMaaSWhoAmI, getMaaSWhoAmIDisplayName } from '~/app/api/whoami';
import { isMaaSAdmin } from '~/app/utilities/whoami';

export type MaaSUserSettings = UserSettings & {
  displayName: string;
  email?: string;
  sub: string;
  orgAdmin: boolean;
};

export const useGridSettings = (): {
  configSettings: ConfigSettings | null;
  userSettings: MaaSUserSettings | null;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>();
  const [config, setConfig] = React.useState<ConfigSettings | null>(null);
  const [user, setUser] = React.useState<MaaSUserSettings | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([fetchConfig(), getMaaSWhoAmI()({})])
      .then(([fetchedConfig, whoAmI]) => {
        if (cancelled) {
          return;
        }
        setConfig(fetchedConfig);
        setUser({
          userId: whoAmI.sub,
          sub: whoAmI.sub,
          displayName: getMaaSWhoAmIDisplayName(whoAmI),
          email: whoAmI.email,
          orgAdmin: isMaaSAdmin(whoAmI),
        });
        setLoaded(true);
        setLoadError(undefined);
      })
      .catch((e) => {
        if (cancelled) {
          return;
        }
        setLoadError(e instanceof Error ? e : new Error('Unable to load MaaS user settings'));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    configSettings: useDeepCompareMemoize(config),
    userSettings: useDeepCompareMemoize(user),
    loaded,
    loadError,
  };
};

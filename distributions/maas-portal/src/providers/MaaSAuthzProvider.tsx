import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';
import { getMaaSWhoAmI } from '@odh-dashboard/maas/api/whoami';

const ADMIN_USER_FLAG = 'ADMIN_USER';
const MODEL_ACCESS_ADMIN_FLAG = 'MAAS_MODEL_ACCESS_ADMIN';

type MaaSAuthzProviderProps = {
  children: React.ReactNode;
};

const MaaSAuthzProvider: React.FC<MaaSAuthzProviderProps> = ({ children }) => {
  const pluginStore = usePluginStore();

  React.useEffect(() => {
    let isCurrent = true;
    pluginStore.setFeatureFlags({ [ADMIN_USER_FLAG]: false, [MODEL_ACCESS_ADMIN_FLAG]: false });

    void getMaaSWhoAmI()({})
      .then(({ isAdmin }) => {
        if (isCurrent) {
          pluginStore.setFeatureFlags({ [ADMIN_USER_FLAG]: isAdmin });
          pluginStore.setFeatureFlags({ [MODEL_ACCESS_ADMIN_FLAG]: isAdmin });
        }
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [pluginStore]);

  return <>{children}</>;
};

export default MaaSAuthzProvider;

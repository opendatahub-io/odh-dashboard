import React from 'react';
import { usePluginStore } from '@openshift/dynamic-plugin-sdk';

const ADMIN_USER_FLAG = 'ADMIN_USER';
const MAAS_ADMIN_ENDPOINT = `${process.env.BASE_PATH || ''}/maas/api/v1/is-maas-admin`;

const isMaaSAdminResponse = (value: unknown): value is { data: { allowed: boolean } } =>
  typeof value === 'object' &&
  value !== null &&
  'data' in value &&
  typeof value.data === 'object' &&
  value.data !== null &&
  'allowed' in value.data &&
  typeof value.data.allowed === 'boolean';

const getMaaSAdminAccess = async (): Promise<boolean> => {
  try {
    const response = await fetch(MAAS_ADMIN_ENDPOINT);
    if (!response.ok) {
      return false;
    }

    const responseBody: unknown = await response.json();
    return isMaaSAdminResponse(responseBody) && responseBody.data.allowed;
  } catch {
    return false;
  }
};

type MaaSAuthzProviderProps = {
  children: React.ReactNode;
};

const MaaSAuthzProvider: React.FC<MaaSAuthzProviderProps> = ({ children }) => {
  const pluginStore = usePluginStore();

  React.useEffect(() => {
    let isCurrent = true;
    pluginStore.setFeatureFlags({ [ADMIN_USER_FLAG]: false });

    void getMaaSAdminAccess().then((allowed) => {
      if (isCurrent) {
        pluginStore.setFeatureFlags({ [ADMIN_USER_FLAG]: allowed });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [pluginStore]);

  return <>{children}</>;
};

export default MaaSAuthzProvider;

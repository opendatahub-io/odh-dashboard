import React from 'react';
import { usePluginStore, FeatureFlags } from '@openshift/dynamic-plugin-sdk';
import { useAppContext } from '#~/app/AppContext';
import { AreaContext } from '#~/concepts/areas/AreaContext';
import { useUser } from '#~/redux/selectors';

// TODO remove use of deprecated API
// Used to define the ADMIN_USER flag currently relied upon in some extensions
// which should be updated to use RBAC instead.
const ADMIN_USER_FLAG = 'ADMIN_USER';
const RHOAI_FLAG = 'RHOAI';

export const PluginStoreAreaFlagsProvider: React.FC = () => {
  const { isAdmin } = useUser();
  const { isRHOAI } = useAppContext();
  const pluginStore = usePluginStore();
  const { areasStatus } = React.useContext(AreaContext);

  const flags = React.useMemo(
    () =>
      Object.keys(areasStatus).reduce<FeatureFlags>((acc, area) => {
        const status = areasStatus[area]?.status;
        if (status != null) {
          acc[area] = status;
        }
        return acc;
      }, {}),
    [areasStatus],
  );

  // update the feature flags on the plugin store
  React.useEffect(
    () =>
      pluginStore.setFeatureFlags({ ...flags, [ADMIN_USER_FLAG]: isAdmin, [RHOAI_FLAG]: isRHOAI }),
    [flags, pluginStore, isAdmin, isRHOAI],
  );
  return null;
};

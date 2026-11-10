import * as React from 'react';
import type { HardwareProfileKind, K8sWatchResult } from '@odh-dashboard/k8s-core';
import { HardwareProfileModel } from '@odh-dashboard/k8s-core/api/models';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import useK8sWatchResourceList from '../hooks/useK8sWatchResourceList';

export type HardwareProfilesContextType = {
  globalHardwareProfiles: K8sWatchResult<HardwareProfileKind[]>;
};

export const HardwareProfilesContext = React.createContext<HardwareProfilesContextType>({
  globalHardwareProfiles: [[], false, undefined],
});

/** Watches namespace-scoped hardware profiles; an absent or empty namespace disables the watch. */
export const useWatchHardwareProfiles = (
  namespace?: string,
): K8sWatchResult<HardwareProfileKind[]> => {
  const resource = React.useMemo(
    () =>
      namespace
        ? {
            isList: true,
            groupVersionKind: groupVersionKind(HardwareProfileModel),
            namespace,
          }
        : null,
    [namespace],
  );

  return useK8sWatchResourceList(resource, HardwareProfileModel);
};

export const HardwareProfilesContextProvider: React.FC<{
  namespace?: string;
  children: React.ReactNode;
}> = ({ namespace, children }) => {
  const [profiles, loaded, error] = useWatchHardwareProfiles(namespace);
  const contextValue = React.useMemo<HardwareProfilesContextType>(
    () => ({ globalHardwareProfiles: [profiles, loaded, error] }),
    [profiles, loaded, error],
  );

  return (
    <HardwareProfilesContext.Provider value={contextValue}>
      {children}
    </HardwareProfilesContext.Provider>
  );
};

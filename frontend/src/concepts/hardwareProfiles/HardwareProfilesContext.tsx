import * as React from 'react';
import { HardwareProfileKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { DEFAULT_LIST_WATCH_RESULT } from '#~/utilities/const';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';

export type HardwareProfilesContextType = {
  globalHardwareProfiles: CustomWatchK8sResult<HardwareProfileKind[]>;
};

export const HardwareProfilesContext = React.createContext<HardwareProfilesContextType>({
  globalHardwareProfiles: DEFAULT_LIST_WATCH_RESULT,
});

export const HardwareProfilesContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const globalHardwareProfiles = useWatchHardwareProfiles(dashboardNamespace);
  const contextValue = React.useMemo(
    () => ({
      globalHardwareProfiles,
    }),
    [globalHardwareProfiles],
  );
  return (
    <HardwareProfilesContext.Provider value={contextValue}>
      {children}
    </HardwareProfilesContext.Provider>
  );
};

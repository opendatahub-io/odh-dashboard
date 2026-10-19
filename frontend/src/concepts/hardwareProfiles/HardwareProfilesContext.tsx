import * as React from 'react';
import { HardwareProfilesContextProvider as SharedHardwareProfilesContextProvider } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import { useDashboardNamespace } from '#~/redux/selectors';

export { HardwareProfilesContext } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
export type { HardwareProfilesContextType } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';

export const HardwareProfilesContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  return (
    <SharedHardwareProfilesContextProvider namespace={dashboardNamespace}>
      {children}
    </SharedHardwareProfilesContextProvider>
  );
};

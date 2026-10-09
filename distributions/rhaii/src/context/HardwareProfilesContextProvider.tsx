import * as React from 'react';
import { HardwareProfilesContextProvider as SharedHardwareProfilesContextProvider } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import { DashboardNamespaceContext } from './DashboardNamespaceContext';

type HardwareProfilesContextProviderProps = {
  children: React.ReactNode;
};

const HardwareProfilesContextProvider: React.FC<HardwareProfilesContextProviderProps> = ({
  children,
}) => {
  const namespace = React.useContext(DashboardNamespaceContext);

  return (
    <SharedHardwareProfilesContextProvider namespace={namespace}>
      {children}
    </SharedHardwareProfilesContextProvider>
  );
};

export default HardwareProfilesContextProvider;

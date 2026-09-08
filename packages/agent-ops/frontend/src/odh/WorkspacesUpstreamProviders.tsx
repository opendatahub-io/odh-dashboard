import * as React from 'react';
import { setApiBasePath } from 'openshell-dashboard/api';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { URL_PREFIX } from '~/app/utilities/const';

type WorkspacesUpstreamProvidersProps = {
  children: React.ReactNode;
};

const WorkspacesUpstreamProviders: React.FC<WorkspacesUpstreamProvidersProps> = ({ children }) => {
  React.useEffect(() => {
    setApiBasePath(URL_PREFIX);
  }, []);

  return (
    <AlertProvider>
      <SlotProvider slots={{}}>{children}</SlotProvider>
    </AlertProvider>
  );
};

export default WorkspacesUpstreamProviders;

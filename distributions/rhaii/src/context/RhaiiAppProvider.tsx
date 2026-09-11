import * as React from 'react';
import {
  IntegrationsContext,
  type IntegrationsStatusContextType,
} from '@odh-dashboard/plugin-core/integrations';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';
import { DashboardNamespaceProvider } from './DashboardNamespaceContext';

type RhaiiAppProviderProps = {
  children: React.ReactNode;
};

const integrationsContextValue: IntegrationsStatusContextType = {
  integrationStatus: {},
  loaded: true,
  error: undefined,
  refresh: () => Promise.resolve(undefined),
};

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => (
  <IntegrationsContext.Provider value={integrationsContextValue}>
    <DashboardNamespaceProvider>
      <ProjectsContextProvider>
        <HostApiProvider>{children}</HostApiProvider>
      </ProjectsContextProvider>
    </DashboardNamespaceProvider>
  </IntegrationsContext.Provider>
);

export default RhaiiAppProvider;

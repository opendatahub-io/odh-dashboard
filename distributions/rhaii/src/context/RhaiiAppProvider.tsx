import * as React from 'react';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';
import { DashboardNamespaceProvider } from './DashboardNamespaceContext';

type RhaiiAppProviderProps = {
  children: React.ReactNode;
};

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => (
  <DashboardNamespaceProvider>
    <ProjectsContextProvider>
      <HostApiProvider>{children}</HostApiProvider>
    </ProjectsContextProvider>
  </DashboardNamespaceProvider>
);

export default RhaiiAppProvider;

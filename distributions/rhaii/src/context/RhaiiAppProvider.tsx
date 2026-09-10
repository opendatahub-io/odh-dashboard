import * as React from 'react';
import HostApiProvider from './HostApiProvider';
import ProjectsContextProvider from './ProjectsContextProvider';

type RhaiiAppProviderProps = {
  children: React.ReactNode;
};

const RhaiiAppProvider: React.FC<RhaiiAppProviderProps> = ({ children }) => (
  <HostApiProvider>
    <ProjectsContextProvider>{children}</ProjectsContextProvider>
  </HostApiProvider>
);

export default RhaiiAppProvider;

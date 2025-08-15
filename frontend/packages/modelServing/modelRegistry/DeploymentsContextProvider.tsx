import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';
import { Deployment, isModelServingPlatformExtension } from '../extension-points';

interface DeploymentsContextProviderProps {
  children: ({ deployments }: { deployments?: Deployment[] }) => React.ReactNode;
  labelSelectors?: { [key: string]: string };
}

const ModelDeploymentsProviderContent: React.FC<{
  children: ({ deployments }: { deployments?: Deployment[] }) => React.ReactNode;
}> = ({ children }) => {
  const { deployments } = React.useContext(ModelDeploymentsContext);
  return <>{children({ deployments })}</>;
};

const DeploymentsContextProvider: React.FC<DeploymentsContextProviderProps> = ({
  children,
  labelSelectors,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const modelServingPlatforms = useExtensions(isModelServingPlatformExtension);

  return (
    <ModelDeploymentsProvider
      projects={projects}
      modelServingPlatforms={modelServingPlatforms}
      labelSelectors={labelSelectors}
    >
      <ModelDeploymentsProviderContent>{children}</ModelDeploymentsProviderContent>
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsContextProvider;

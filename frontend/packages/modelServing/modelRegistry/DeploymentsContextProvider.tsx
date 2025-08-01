import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ModelDeploymentsProvider } from '../src/concepts/ModelDeploymentsContext';
import { isModelServingPlatformExtension } from '../extension-points';

interface DeploymentsContextProviderProps {
  children: React.ReactNode;
  labelSelectors?: { [key: string]: string };
}

/**
 * Wrapper component for ModelDeploymentsProvider to be used as an extension
 * Gets projects and modelServingPlatforms internally to be self-contained
 */
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
      {children}
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsContextProvider;

import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes.js';
import {
  ModelDeploymentsContext,
  ModelDeploymentsProvider,
} from '../src/concepts/ModelDeploymentsContext';
import { isModelServingPlatformExtension } from '../extension-points';

interface DeploymentsContextProviderProps {
  children: ({
    deployments,
    loaded,
    errors,
    projects,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deployments?: any[];
    loaded: boolean;
    errors?: Error[];
    projects?: ProjectKind[];
  }) => React.ReactNode;
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
      <ModelDeploymentsContext.Consumer>
        {({ deployments, loaded, errors }) => children({ deployments, loaded, errors, projects })}
      </ModelDeploymentsContext.Consumer>
    </ModelDeploymentsProvider>
  );
};

export default DeploymentsContextProvider;

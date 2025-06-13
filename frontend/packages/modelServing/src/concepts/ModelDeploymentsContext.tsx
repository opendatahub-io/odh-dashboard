import React from 'react';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingPlatform } from './useProjectServingPlatform';
import { Deployment } from '../../extension-points';

type ModelDeploymentsContextType = {
  deployments?: Deployment[];
  loaded: boolean;
  error?: Error;
};

export const ModelDeploymentsContext = React.createContext<ModelDeploymentsContextType>({
  deployments: undefined,
  loaded: false,
  error: undefined,
});

type ModelDeploymentsProviderProps = {
  project: ProjectKind;
  modelServingPlatform: ModelServingPlatform;
  children: React.ReactNode;
};

export const ModelDeploymentsProvider: React.FC<ModelDeploymentsProviderProps> = ({
  project,
  modelServingPlatform,
  children,
}) => {
  const useWatchDeployments = modelServingPlatform.properties.deployments.watch;

  const [deployments, loaded, error] = useWatchDeployments(project);

  const contextValue = React.useMemo<ModelDeploymentsContextType>(
    () => ({
      deployments,
      loaded,
      error,
    }),
    [deployments, loaded, error],
  );

  return (
    <ModelDeploymentsContext.Provider value={contextValue}>
      {children}
    </ModelDeploymentsContext.Provider>
  );
};

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useActiveServingPlatform, ModelServingPlatform } from './modelServingPlatforms';
import { useDeployedModels } from './deployments';
import { isModelServingPlatformExtension, Deployment } from '../../extension-points';

type ModelServingContextType = {
  availablePlatforms?: ModelServingPlatform[];
  project?: ProjectKind;
  platform?: ModelServingPlatform | null;
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  resetModelServingPlatform: () => void;
  newModelServingPlatformLoading?: ModelServingPlatform | null;
  activeModelServingPlatformError: string | null;
  deployments?: Deployment[] | null;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  availablePlatforms: undefined,
  project: undefined,
  platform: undefined,
  setModelServingPlatform: () => undefined,
  resetModelServingPlatform: () => undefined,
  newModelServingPlatformLoading: undefined,
  activeModelServingPlatformError: null,
  deployments: undefined,
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [availablePlatforms] = useResolvedExtensions(isModelServingPlatformExtension);
  const {
    activePlatform,
    setActivePlatform,
    resetActivePlatform,
    newPlatformLoading: activePlatformLoading,
    activePlatformError,
  } = useActiveServingPlatform(currentProject, availablePlatforms);

  const [deployedModels] = useDeployedModels(currentProject, activePlatform);

  const contextValue = React.useMemo<ModelServingContextType>(
    () => ({
      availablePlatforms,
      project: currentProject,
      platform: activePlatform,
      setModelServingPlatform: setActivePlatform,
      resetModelServingPlatform: resetActivePlatform,
      deployments: deployedModels,
      newModelServingPlatformLoading: activePlatformLoading,
      activeModelServingPlatformError: activePlatformError,
    }),
    [
      currentProject,
      activePlatform,
      deployedModels,
      setActivePlatform,
      resetActivePlatform,
      availablePlatforms,
      activePlatformLoading,
      activePlatformError,
    ],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};

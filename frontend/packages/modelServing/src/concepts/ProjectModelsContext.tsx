import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useActiveServingPlatform, ModelServingPlatform } from './modelServingPlatforms';
import { isModelServingPlatformExtension } from '../extension-points';

type ModelServingContextType = {
  availablePlatforms?: ModelServingPlatform[];
  project?: ProjectKind;
  platform?: ModelServingPlatform | null;
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  resetModelServingPlatform: () => void;
  models?: string[];
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  availablePlatforms: undefined,
  project: undefined,
  platform: undefined,
  setModelServingPlatform: () => undefined,
  resetModelServingPlatform: () => undefined,
  models: [],
});

type ModelServingProviderProps = {
  children: React.ReactNode;
};

export const ModelServingProvider: React.FC<ModelServingProviderProps> = ({ children }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [availablePlatforms] = useResolvedExtensions(isModelServingPlatformExtension);
  const { activePlatform, setActivePlatform, resetActivePlatform } = useActiveServingPlatform(
    currentProject,
    availablePlatforms,
  );

  const [deployedModels] = React.useState<string[]>([]);

  const contextValue = React.useMemo<ModelServingContextType>(
    () => ({
      availablePlatforms,
      project: currentProject,
      platform: activePlatform,
      setModelServingPlatform: setActivePlatform,
      resetModelServingPlatform: resetActivePlatform,
      models: deployedModels,
    }),
    [
      currentProject,
      activePlatform,
      deployedModels,
      setActivePlatform,
      resetActivePlatform,
      availablePlatforms,
    ],
  );

  return (
    <ModelServingContext.Provider value={contextValue}>{children}</ModelServingContext.Provider>
  );
};

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingContext } from './ModelServingContext';
import { useActiveServingPlatform, ModelServingPlatform } from './modelServingPlatforms';

type ProjectModelsContextType = {
  project?: ProjectKind;
  platform?: ModelServingPlatform | null;
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  resetModelServingPlatform: () => void;
  models?: string[];
};

export const ProjectModelsContext = React.createContext<ProjectModelsContextType>({
  project: undefined,
  platform: undefined,
  setModelServingPlatform: () => undefined,
  resetModelServingPlatform: () => undefined,
  models: [],
});

type ProjectModelsProviderProps = {
  children: React.ReactNode;
};

export const ProjectModelsProvider: React.FC<ProjectModelsProviderProps> = ({ children }) => {
  const { availablePlatforms } = React.useContext(ModelServingContext);
  const { currentProject } = React.useContext(ProjectDetailsContext); // TODO: this should refresh from a websocket

  const { activePlatform, setActivePlatform, resetActivePlatform } = useActiveServingPlatform(
    currentProject,
    availablePlatforms,
  );

  const [deployedModels] = React.useState<string[]>([]);

  const contextValue = React.useMemo(
    () =>
      ({
        project: currentProject,
        platform: activePlatform,
        setModelServingPlatform: setActivePlatform,
        resetModelServingPlatform: resetActivePlatform,
        models: deployedModels,
      } satisfies ProjectModelsContextType),
    [currentProject, activePlatform, deployedModels, setActivePlatform, resetActivePlatform],
  );

  return (
    <ProjectModelsContext.Provider value={contextValue}>{children}</ProjectModelsContext.Provider>
  );
};

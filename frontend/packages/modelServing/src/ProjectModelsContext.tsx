import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingContext, ModelServingPlatform } from './ModelServingContext';
import { getActiveServingPlatform } from './concepts/modelServingPlatforms';

type ProjectModelsContextType = {
  project?: ProjectKind;
  platform?: ModelServingPlatform | null;
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  models?: string[];
};

export const ProjectModelsContext = React.createContext<ProjectModelsContextType>({
  project: undefined,
  platform: undefined,
  setModelServingPlatform: () => undefined,
  models: [],
});

type ProjectModelsProviderProps = {
  children: React.ReactNode;
};

export const ProjectModelsProvider: React.FC<ProjectModelsProviderProps> = ({ children }) => {
  const { availablePlatforms } = React.useContext(ModelServingContext);
  const { currentProject } = React.useContext(ProjectDetailsContext); // TODO: this should refresh from a websocket

  const [servingPlatform, setServingPlatform] = React.useState<
    ProjectModelsContextType['platform']
  >(getActiveServingPlatform(currentProject, availablePlatforms ?? []));
  const setModelServingPlatform = React.useCallback(
    (platform: ModelServingPlatform) => {
      setServingPlatform(platform);
      platform.properties.enable(currentProject);
    },
    [currentProject, setServingPlatform],
  );

  const [deployedModels] = React.useState<string[]>([]);

  const contextValue = React.useMemo(
    () =>
      ({
        project: currentProject,
        platform: servingPlatform,
        setModelServingPlatform,
        models: deployedModels,
      } satisfies ProjectModelsContextType),
    [currentProject, servingPlatform, deployedModels, setModelServingPlatform],
  );

  return (
    <ProjectModelsContext.Provider value={contextValue}>{children}</ProjectModelsContext.Provider>
  );
};

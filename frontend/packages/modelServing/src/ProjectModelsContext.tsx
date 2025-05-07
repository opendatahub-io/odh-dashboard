import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingContext } from './ModelServingContext';
import { ModelServingPlatform } from './extension-points';
import { getActiveServingPlatform } from './concepts/modelServingPlatforms';

type ProjectModelsContextType = {
  project?: ProjectKind;
  servingPlatform?: ModelServingPlatform | null;
  setModelServingPlatform: (platform: ModelServingPlatform) => void;
  models?: string[];
};

export const ProjectModelsContext = React.createContext<ProjectModelsContextType>({
  project: undefined,
  servingPlatform: undefined,
  setModelServingPlatform: () => undefined,
  models: [],
});

type ProjectModelsProviderProps = {
  children: React.ReactNode;
};

export const ProjectModelsProvider: React.FC<ProjectModelsProviderProps> = ({ children }) => {
  const { modelServingPlatforms } = React.useContext(ModelServingContext);
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const [servingPlatform, setServingPlatform] = React.useState<
    ProjectModelsContextType['servingPlatform']
  >(getActiveServingPlatform(currentProject, modelServingPlatforms));
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
        servingPlatform,
        setModelServingPlatform,
        models: deployedModels,
      } satisfies ProjectModelsContextType),
    [currentProject, servingPlatform, deployedModels, setModelServingPlatform],
  );

  return (
    <ProjectModelsContext.Provider value={contextValue}>{children}</ProjectModelsContext.Provider>
  );
};

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';

type ProjectModelsContextType = {
  project?: ProjectKind;
  servingPlatform: string;
  setServingPlatform: (servingPlatform: string) => void;
  models: string[];
};

export const ProjectModelsContext = React.createContext<ProjectModelsContextType>({
  project: undefined,
  servingPlatform: '',
  setServingPlatform: () => undefined,
  models: [],
});

type ProjectModelsProviderProps = {
  children: React.ReactNode;
};

export const ProjectModelsProvider: React.FC<ProjectModelsProviderProps> = ({ children }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [servingPlatform, setServingPlatform] = React.useState<string>('');
  const [deployedModels] = React.useState<string[]>([]);

  const contextValue = React.useMemo(
    () =>
      ({
        project: currentProject,
        servingPlatform,
        setServingPlatform,
        models: deployedModels,
      } satisfies ProjectModelsContextType),
    [currentProject, servingPlatform, deployedModels],
  );

  return (
    <ProjectModelsContext.Provider value={contextValue}>{children}</ProjectModelsContext.Provider>
  );
};

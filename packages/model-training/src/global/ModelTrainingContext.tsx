import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { DEFAULT_LIST_WATCH_RESULT } from '@odh-dashboard/internal/utilities/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { useTrainJobs } from '../api';
import { TrainJobKind } from '../k8sTypes';

type ModelTrainingContextType = {
  trainJobs: CustomWatchK8sResult<TrainJobKind[]>;
  project?: ProjectKind | null;
  preferredProject?: ProjectKind | null;
  projects?: ProjectKind[] | null;
};

type ModelTrainingContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
};

export const ModelTrainingContext = React.createContext<ModelTrainingContextType>({
  trainJobs: DEFAULT_LIST_WATCH_RESULT,
  project: null,
  preferredProject: null,
  projects: null,
});

export const ModelTrainingContextProvider: React.FC<ModelTrainingContextProviderProps> = ({
  children,
  namespace,
}) => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;

  const trainJobs = useTrainJobs(namespace ?? '');

  const contextValue = React.useMemo(
    () => ({
      trainJobs,
      project,
      preferredProject,
      projects,
    }),
    [trainJobs, project, preferredProject, projects],
  );

  return (
    <ModelTrainingContext.Provider value={contextValue}>{children}</ModelTrainingContext.Provider>
  );
};

export const useModelTrainingContext = (): ModelTrainingContextType =>
  React.useContext(ModelTrainingContext);

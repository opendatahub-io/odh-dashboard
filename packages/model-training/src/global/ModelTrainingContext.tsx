import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { DEFAULT_LIST_WATCH_RESULT } from '@odh-dashboard/internal/utilities/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import { useTrainJobs, useRayJobs } from '../api';
import { TrainJobKind, RayJobKind } from '../k8sTypes';

const EMPTY_TRAIN_JOBS: CustomWatchK8sResult<TrainJobKind[]> = [[], true, undefined];
const EMPTY_RAY_JOBS: CustomWatchK8sResult<RayJobKind[]> = [[], true, undefined];

type ModelTrainingContextType = {
  trainJobs: CustomWatchK8sResult<TrainJobKind[]>;
  rayJobs: CustomWatchK8sResult<RayJobKind[]>;
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
  rayJobs: DEFAULT_LIST_WATCH_RESULT,
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

  const isModelTrainingAvailable = useIsAreaAvailable(SupportedArea.MODEL_TRAINING).status;
  const isRayJobsAvailable = useIsAreaAvailable(SupportedArea.RAY_JOBS).status;

  const trainJobsWatch = useTrainJobs(isModelTrainingAvailable ? namespace ?? '' : null);
  const trainJobs: CustomWatchK8sResult<TrainJobKind[]> = isModelTrainingAvailable
    ? trainJobsWatch
    : EMPTY_TRAIN_JOBS;

  const rayJobsWatch = useRayJobs(isRayJobsAvailable ? namespace ?? '' : null);
  const rayJobs: CustomWatchK8sResult<RayJobKind[]> = isRayJobsAvailable
    ? rayJobsWatch
    : EMPTY_RAY_JOBS;

  const contextValue = React.useMemo(
    () => ({
      trainJobs,
      rayJobs,
      project,
      preferredProject,
      projects,
    }),
    [trainJobs, rayJobs, project, preferredProject, projects],
  );

  return (
    <ModelTrainingContext.Provider value={contextValue}>{children}</ModelTrainingContext.Provider>
  );
};

export const useModelTrainingContext = (): ModelTrainingContextType =>
  React.useContext(ModelTrainingContext);

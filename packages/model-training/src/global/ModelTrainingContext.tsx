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

type ProjectWatcherProps = {
  projectName: string;
  onTrainJobsChange: (projectName: string, result: CustomWatchK8sResult<TrainJobKind[]>) => void;
  onRayJobsChange: (projectName: string, result: CustomWatchK8sResult<RayJobKind[]>) => void;
  onUnmount: (projectName: string) => void;
  watchTrainJobs: boolean;
  watchRayJobs: boolean;
};

const ProjectWatcher: React.FC<ProjectWatcherProps> = ({
  projectName,
  onTrainJobsChange,
  onRayJobsChange,
  onUnmount,
  watchTrainJobs,
  watchRayJobs,
}) => {
  const trainJobsResult = useTrainJobs(watchTrainJobs ? projectName : null);
  const rayJobsResult = useRayJobs(watchRayJobs ? projectName : null);

  React.useEffect(() => {
    onTrainJobsChange(projectName, watchTrainJobs ? trainJobsResult : EMPTY_TRAIN_JOBS);
  }, [projectName, trainJobsResult, onTrainJobsChange, watchTrainJobs]);

  React.useEffect(() => {
    onRayJobsChange(projectName, watchRayJobs ? rayJobsResult : EMPTY_RAY_JOBS);
  }, [projectName, rayJobsResult, onRayJobsChange, watchRayJobs]);

  React.useEffect(
    () => () => {
      onUnmount(projectName);
    },
    [projectName, onUnmount],
  );

  return null;
};

const useMergedWatchResults = <T extends TrainJobKind | RayJobKind>(
  resultsMap: Record<string, CustomWatchK8sResult<T[]>>,
  projectCount: number,
): CustomWatchK8sResult<T[]> =>
  React.useMemo(() => {
    const entries = Object.values(resultsMap);
    const allData = entries.flatMap(([data]) => data);
    // React 18 batches both setState calls in handleUnmount so entries is never stale between them
    const allLoaded = entries.length >= projectCount && entries.every(([, loaded]) => loaded);
    const firstError = entries.find(([, , error]) => error)?.[2];
    return [allData, allLoaded, firstError];
  }, [resultsMap, projectCount]);

export const ModelTrainingContextProvider: React.FC<ModelTrainingContextProviderProps> = ({
  children,
  namespace,
}) => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;

  const isModelTrainingAvailable = useIsAreaAvailable(SupportedArea.MODEL_TRAINING).status;
  const isRayJobsAvailable = useIsAreaAvailable(SupportedArea.RAY_JOBS).status;

  const isSingleProject = !!namespace;

  // Single-project mode: watch one namespace directly
  const trainJobsWatch = useTrainJobs(
    isSingleProject && isModelTrainingAvailable ? namespace : null,
  );
  const rayJobsWatch = useRayJobs(isSingleProject && isRayJobsAvailable ? namespace : null);

  // Multi-project mode: aggregate results from per-project watchers
  const [trainJobsMap, setTrainJobsMap] = React.useState<
    Record<string, CustomWatchK8sResult<TrainJobKind[]>>
  >({});
  const [rayJobsMap, setRayJobsMap] = React.useState<
    Record<string, CustomWatchK8sResult<RayJobKind[]>>
  >({});

  const handleTrainJobsChange = React.useCallback(
    (projectName: string, result: CustomWatchK8sResult<TrainJobKind[]>) => {
      setTrainJobsMap((prev) => ({ ...prev, [projectName]: result }));
    },
    [],
  );

  const handleRayJobsChange = React.useCallback(
    (projectName: string, result: CustomWatchK8sResult<RayJobKind[]>) => {
      setRayJobsMap((prev) => ({ ...prev, [projectName]: result }));
    },
    [],
  );

  const handleUnmount = React.useCallback((projectName: string) => {
    setTrainJobsMap((prev) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
      const { [projectName]: _, ...rest } = prev;
      return rest;
    });
    setRayJobsMap((prev) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
      const { [projectName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const mergedTrainJobs = useMergedWatchResults<TrainJobKind>(trainJobsMap, projects.length);
  const mergedRayJobs = useMergedWatchResults<RayJobKind>(rayJobsMap, projects.length);

  const trainJobs: CustomWatchK8sResult<TrainJobKind[]> = isSingleProject
    ? isModelTrainingAvailable
      ? trainJobsWatch
      : EMPTY_TRAIN_JOBS
    : isModelTrainingAvailable
    ? mergedTrainJobs
    : EMPTY_TRAIN_JOBS;

  const rayJobs: CustomWatchK8sResult<RayJobKind[]> = isSingleProject
    ? isRayJobsAvailable
      ? rayJobsWatch
      : EMPTY_RAY_JOBS
    : isRayJobsAvailable
    ? mergedRayJobs
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
    <ModelTrainingContext.Provider value={contextValue}>
      {!isSingleProject &&
        (isModelTrainingAvailable || isRayJobsAvailable) &&
        projects.map((p) => (
          <ProjectWatcher
            key={p.metadata.name}
            projectName={p.metadata.name}
            onTrainJobsChange={handleTrainJobsChange}
            onRayJobsChange={handleRayJobsChange}
            onUnmount={handleUnmount}
            watchTrainJobs={isModelTrainingAvailable}
            watchRayJobs={isRayJobsAvailable}
          />
        ))}
      {children}
    </ModelTrainingContext.Provider>
  );
};

export const useModelTrainingContext = (): ModelTrainingContextType =>
  React.useContext(ModelTrainingContext);

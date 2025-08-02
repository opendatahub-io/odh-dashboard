import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { PyTorchJobKind } from '../k8sTypes';
import { DEFAULT_LIST_WATCH_RESULT } from '@odh-dashboard/internal/utilities/const';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { usePyTorchJobs } from '../api';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';

type ModelTrainingContextType = {
  pytorchJobs: CustomWatchK8sResult<PyTorchJobKind[]>;
  project?: ProjectKind | null;
  preferredProject?: ProjectKind | null;
  projects?: ProjectKind[] | null;
};

type ModelTrainingContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
};

export const ModelTrainingContext = React.createContext<ModelTrainingContextType>({
  pytorchJobs: DEFAULT_LIST_WATCH_RESULT,
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

  const pytorchJobs = usePyTorchJobs(namespace ?? '');

  return (
    <ModelTrainingContext.Provider
      value={{
        pytorchJobs,
        project,
        preferredProject,
        projects,
      }}
    >
      {children}
    </ModelTrainingContext.Provider>
  );
};

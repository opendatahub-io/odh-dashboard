import * as React from 'react';
import { LMEvalKind, ProjectKind } from '#~/k8sTypes';
import { DEFAULT_LIST_WATCH_RESULT } from '#~/utilities/const';
import { SupportedArea, conditionalArea } from '#~/concepts/areas';
import { ProjectsContext, byName } from '#~/concepts/projects/ProjectsContext';
import { useLMEvalJob } from '#~/api/index.ts';
import { CustomWatchK8sResult } from '#~/types.ts';

type LMEvalContextType = {
  lmEval: CustomWatchK8sResult<LMEvalKind[]>;
  project?: ProjectKind | null;
  preferredProject?: ProjectKind | null;
  projects?: ProjectKind[] | null;
};

type LMEvalContextProviderProps = {
  children: React.ReactNode;
  namespace?: string;
};

export const LMEvalContext = React.createContext<LMEvalContextType>({
  lmEval: DEFAULT_LIST_WATCH_RESULT,
  project: null,
  preferredProject: null,
  projects: null,
});

export const LMEvalContextProvider = conditionalArea<LMEvalContextProviderProps>(
  SupportedArea.LM_EVAL,
  true,
)(({ children, namespace }) => {
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;

  const lmEval = useLMEvalJob(namespace ?? '');

  return (
    <LMEvalContext.Provider
      value={{
        lmEval,
        project,
        preferredProject,
        projects,
      }}
    >
      {children}
    </LMEvalContext.Provider>
  );
});

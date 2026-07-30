import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

export type CurrentProjectContextType = {
  currentProject: ProjectKind;
};

const DEFAULT_VALUE: CurrentProjectContextType = {
  currentProject: { apiVersion: '', kind: '', metadata: { name: '' } },
};

export const CurrentProjectContext = React.createContext<CurrentProjectContextType>(DEFAULT_VALUE);

export const useCurrentProject = (): ProjectKind => {
  const { currentProject } = React.useContext(CurrentProjectContext);
  if (!currentProject.metadata.name) {
    throw new Error('useCurrentProject must be used within a CurrentProjectContext provider');
  }
  return currentProject;
};

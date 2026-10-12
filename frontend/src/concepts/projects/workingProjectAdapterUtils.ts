import type { ProjectKind } from '@odh-dashboard/k8s-core';
import type { ProjectIdentity } from '@odh-dashboard/ui-core/context/WorkingProjectContext';

export const toWorkingProjectIdentity = (project: ProjectKind): ProjectIdentity => ({
  name: project.metadata.name,
  ...(project.metadata.annotations?.['openshift.io/display-name'] && {
    displayName: project.metadata.annotations['openshift.io/display-name'],
  }),
});

/** Accessing the browser storage property itself can throw (e.g. blocked storage). */
export const getWorkingProjectStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

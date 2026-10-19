import type { ProjectKind } from '@odh-dashboard/k8s-core';
import type { ProjectIdentity } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { readStoredWorkingProjectName } from '@odh-dashboard/ui-core/context/workingProjectStorage';

export const toWorkingProjectIdentity = (project: ProjectKind): ProjectIdentity => ({
  name: project.metadata.name,
  ...(project.metadata.annotations?.['openshift.io/display-name'] && {
    displayName: project.metadata.annotations['openshift.io/display-name'],
  }),
});

/** Read only the working-project entry; accessing storage itself can throw. */
export const getStoredWorkingProjectName = (): string | null => {
  try {
    return readStoredWorkingProjectName(window.localStorage);
  } catch {
    return null;
  }
};

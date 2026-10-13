import type { ProjectKind } from '@odh-dashboard/k8s-core';
import type { ProjectIdentity } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { parseStoredWorkingProjectName } from '@odh-dashboard/ui-core/context/workingProjectStorage';

export const toWorkingProjectIdentity = (project: ProjectKind): ProjectIdentity => ({
  name: project.metadata.name,
  ...(project.metadata.annotations?.['openshift.io/display-name'] && {
    displayName: project.metadata.annotations['openshift.io/display-name'],
  }),
});

/** Read only the working-project entry; accessing storage itself can throw. */
export const getStoredWorkingProjectName = (): string | null => {
  try {
    return parseStoredWorkingProjectName(
      window.localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY),
    );
  } catch {
    return null;
  }
};

import * as React from 'react';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectKind } from '~/k8sTypes';

const useSyncPreferredProject = (page: string, newPreferredProject: ProjectKind | null): void => {
  const { getPreferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const preferredProject = getPreferredProject(page);

  React.useEffect(() => {
    if (newPreferredProject?.metadata.name !== preferredProject?.metadata.name) {
      updatePreferredProject(page, newPreferredProject?.metadata.name || null);
    }
  }, [page, newPreferredProject, preferredProject, updatePreferredProject]);
};

export default useSyncPreferredProject;

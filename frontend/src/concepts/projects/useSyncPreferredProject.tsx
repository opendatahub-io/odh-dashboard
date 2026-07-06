import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';

const useSyncPreferredProject = (newPreferredProject: ProjectKind | null): void => {
  const { preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);

  React.useEffect(() => {
    if (newPreferredProject?.metadata.name !== preferredProject?.metadata.name) {
      updatePreferredProject(newPreferredProject);
    }
  }, [newPreferredProject, preferredProject, updatePreferredProject]);
};

export default useSyncPreferredProject;

import * as React from 'react';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { ProjectKind } from '#~/k8sTypes';

const useSyncPreferredProject = (newPreferredProject: ProjectKind | null): void => {
  const { preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);

  React.useEffect(() => {
    if (newPreferredProject?.metadata.name !== preferredProject?.metadata.name) {
      updatePreferredProject(newPreferredProject);
    }
  }, [newPreferredProject, preferredProject, updatePreferredProject]);
};

export default useSyncPreferredProject;

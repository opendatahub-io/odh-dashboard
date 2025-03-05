import * as React from 'react';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { ProjectKind } from '~/k8sTypes';

const useSyncPreferredProject = (newPreferredProject: ProjectKind | null): void => {
  const savedPreferredProject = React.useRef(newPreferredProject);
  const { preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);

  React.useEffect(() => {
    if (savedPreferredProject.current?.metadata.name !== newPreferredProject?.metadata.name) {
      if (newPreferredProject?.metadata.name !== preferredProject?.metadata.name) {
        updatePreferredProject(newPreferredProject);
        savedPreferredProject.current = newPreferredProject;
      }
    }
  }, [newPreferredProject, preferredProject?.metadata.name, updatePreferredProject]);
};

export default useSyncPreferredProject;

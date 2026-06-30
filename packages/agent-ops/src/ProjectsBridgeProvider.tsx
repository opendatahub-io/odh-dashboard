import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { ProjectsBridgeData } from '../frontend/src/odh/extension-points';

type ProjectsBridgeProviderProps = {
  children: (data: ProjectsBridgeData) => React.ReactNode;
};

const ProjectsBridgeProvider: React.FC<ProjectsBridgeProviderProps> = ({ children }) => {
  const { projects, preferredProject, updatePreferredProject, loaded, loadError } =
    React.useContext(ProjectsContext);

  const bridgeProjects = React.useMemo(
    () =>
      projects.map((project) => ({
        name: project.metadata.name,
        displayName: getDisplayNameFromK8sResource(project),
      })),
    [projects],
  );

  const bridgePreferred = React.useMemo(
    () =>
      preferredProject
        ? {
            name: preferredProject.metadata.name,
            displayName: getDisplayNameFromK8sResource(preferredProject),
          }
        : null,
    [preferredProject],
  );

  const bridgeUpdatePreferred = React.useCallback(
    (ref: { name: string } | null) => {
      if (!ref) {
        updatePreferredProject(null);
        return;
      }
      const match = projects.find((project) => project.metadata.name === ref.name) ?? null;
      updatePreferredProject(match);
    },
    [projects, updatePreferredProject],
  );

  const data = React.useMemo(
    () => ({
      projects: bridgeProjects,
      preferredProject: bridgePreferred,
      updatePreferredProject: bridgeUpdatePreferred,
      loaded,
      loadError: loadError ?? null,
    }),
    [bridgeProjects, bridgePreferred, bridgeUpdatePreferred, loaded, loadError],
  );

  return <>{children(data)}</>;
};

export default ProjectsBridgeProvider;

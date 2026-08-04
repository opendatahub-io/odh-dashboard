import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectsBridgeData } from '../frontend/src/odh/extension-points';

const getProjectDisplayName = (project: {
  metadata: { name: string; annotations?: Record<string, string> };
}): string => project.metadata.annotations?.['openshift.io/display-name'] || project.metadata.name;

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
        displayName: getProjectDisplayName(project),
      })),
    [projects],
  );

  const bridgePreferred = React.useMemo(
    () =>
      preferredProject
        ? {
            name: preferredProject.metadata.name,
            displayName: getProjectDisplayName(preferredProject),
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

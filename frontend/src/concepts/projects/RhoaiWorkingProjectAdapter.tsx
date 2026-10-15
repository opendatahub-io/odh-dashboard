import * as React from 'react';
import { resolveWorkingProject } from '@odh-dashboard/foundation';
import { isAiProject } from '@odh-dashboard/k8s-core';
import {
  type ProjectIdentity,
  WorkingProjectProvider,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  getStoredWorkingProjectName,
  toWorkingProjectIdentity,
} from './workingProjectAdapterUtils';

type Props = { children: React.ReactNode };

/** Mount inside the opted-in RHOAI ProjectsContextProvider, above the Page and its masthead. */
const RhoaiWorkingProjectAdapter: React.FC<Props> = ({ children }) => {
  const { projects, preferredProject, updatePreferredProject, loaded, loadError } =
    React.useContext(ProjectsContext);
  const available = loaded && !loadError;
  const { identities, projectByName } = React.useMemo(
    () => ({
      identities: projects.map(toWorkingProjectIdentity),
      projectByName: new Map(projects.map((project) => [project.metadata.name, project])),
    }),
    [projects],
  );
  const preferredName = preferredProject?.metadata.name;
  const knownPreferred = available ? projectByName.get(preferredName ?? '') : undefined;
  const storedName = available && !knownPreferred ? getStoredWorkingProjectName() : null;
  const resolution = resolveWorkingProject({
    list: available
      ? { status: 'listed', projects: identities }
      : { status: loadError ? 'error' : 'loading' },
    route: null,
    storedName: knownPreferred?.metadata.name ?? storedName,
    isAiProject: ({ name }) => {
      const source = projectByName.get(name);
      return source ? isAiProject(source) : false;
    },
  });
  const resolvedName = resolution.activeProject?.name;
  React.useEffect(() => {
    if (!available || !resolvedName || resolvedName === preferredName) {
      return;
    }
    const resolved = projectByName.get(resolvedName);
    if (resolved) {
      updatePreferredProject(resolved);
    }
  }, [available, preferredName, projectByName, resolvedName, updatePreferredProject]);

  const selectProject = React.useCallback(
    (identity: ProjectIdentity) => {
      if (!available) {
        return;
      }
      const source = projectByName.get(identity.name);
      if (source && source.metadata.name !== preferredName) {
        updatePreferredProject(source);
      }
    },
    [available, projectByName, preferredName, updatePreferredProject],
  );

  return (
    <WorkingProjectProvider
      status={loadError ? 'project-source-error' : loaded ? 'listed' : 'loading'}
      projects={resolution.orderedProjects}
      activeProject={resolution.activeProject}
      onProjectChange={selectProject}
    >
      {children}
    </WorkingProjectProvider>
  );
};

export default RhoaiWorkingProjectAdapter;

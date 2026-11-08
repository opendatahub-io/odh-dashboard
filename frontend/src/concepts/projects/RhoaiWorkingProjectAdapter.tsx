import * as React from 'react';
import { resolveWorkingProject } from '@odh-dashboard/foundation';
import { isAiProject } from '@odh-dashboard/k8s-core';
import {
  type ProjectIdentity,
  type WorkingProjectNavigation,
  WorkingProjectProvider,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import {
  useWorkingProjectSynchronization,
  type WorkingProjectChange,
} from '@odh-dashboard/ui-core/hooks/useWorkingProjectSynchronization';
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
  const navigation = React.useRef(new Map<symbol, WorkingProjectNavigation>());
  const routeSyncCount = React.useRef(0);
  const registerProjectRouteSync = React.useCallback(() => {
    routeSyncCount.current += 1;
    return () => {
      routeSyncCount.current -= 1;
    };
  }, []);
  const pendingNavigation = React.useRef<{ token: symbol; owner: symbol } | null>(null);
  const navigationBlockers = React.useRef(new Set<() => void>());
  const registerProjectNavigationBlocker = React.useCallback((reset: () => void) => {
    navigationBlockers.current.add(reset);
    return () => {
      navigationBlockers.current.delete(reset);
    };
  }, []);
  const cancelProjectNavigation = React.useCallback(() => {
    const pending = pendingNavigation.current;
    pendingNavigation.current = null;
    if (pending) {
      navigationBlockers.current.forEach((reset) => reset());
    }
  }, []);
  const registerProjectNavigation = React.useCallback(
    (navigate: WorkingProjectNavigation) => {
      const owner = Symbol('project-navigation');
      navigation.current.set(owner, navigate);
      return () => {
        navigation.current.delete(owner);
        if (pendingNavigation.current?.owner === owner) {
          cancelProjectNavigation();
        }
      };
    },
    [cancelProjectNavigation],
  );
  const latestSource = React.useRef({ available, projects, updatePreferredProject });
  React.useLayoutEffect(() => {
    latestSource.current = { available, projects, updatePreferredProject };
    if (!available) {
      cancelProjectNavigation();
    }
  }, [available, projects, updatePreferredProject, cancelProjectNavigation]);
  React.useEffect(() => cancelProjectNavigation, [cancelProjectNavigation]);
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
    (identity: ProjectIdentity, change?: WorkingProjectChange) => {
      if (!available) {
        return;
      }
      const source = projectByName.get(identity.name);
      if (source) {
        const registration = Array.from(navigation.current.entries()).pop();
        if (change?.source === 'storage' && !registration && routeSyncCount.current > 0) {
          // A route that syncs its URL project cannot follow an external selection
          // without navigation. Do not let it write its old project back to storage.
          cancelProjectNavigation();
          return;
        }
        if (change?.source === 'storage' && change.replace && registration) {
          const [owner, navigate] = registration;
          cancelProjectNavigation();
          // The mounted surface supplies its own builder; the host never parses feature routes.
          const token = Symbol('project-switch');
          pendingNavigation.current = { token, owner };
          navigate(toWorkingProjectIdentity(source), {
            commit: () => {
              if (pendingNavigation.current?.token !== token) {
                return;
              }
              pendingNavigation.current = null;
              const latest = latestSource.current;
              const known = latest.projects.find(({ metadata }) => metadata.name === identity.name);
              if (latest.available && known) {
                latest.updatePreferredProject(known);
              }
            },
            cancel: () => {
              if (pendingNavigation.current?.token === token) {
                cancelProjectNavigation();
              }
            },
          });
          return;
        }
        cancelProjectNavigation();
        if (source.metadata.name !== preferredName) {
          updatePreferredProject(source);
        }
      }
    },
    [available, projectByName, preferredName, updatePreferredProject, cancelProjectNavigation],
  );

  useWorkingProjectSynchronization({
    projects: resolution.orderedProjects,
    activeProject: resolution.activeProject,
    status: loadError ? 'project-source-error' : loaded ? 'listed' : 'loading',
    onProjectChange: selectProject,
  });

  return (
    <WorkingProjectProvider
      status={loadError ? 'project-source-error' : loaded ? 'listed' : 'loading'}
      projects={resolution.orderedProjects}
      activeProject={resolution.activeProject}
      onProjectChange={selectProject}
      registerProjectNavigation={registerProjectNavigation}
      registerProjectRouteSync={registerProjectRouteSync}
      cancelProjectNavigation={cancelProjectNavigation}
      registerProjectNavigationBlocker={registerProjectNavigationBlocker}
    >
      {children}
    </WorkingProjectProvider>
  );
};

export default RhoaiWorkingProjectAdapter;

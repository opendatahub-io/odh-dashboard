import * as React from 'react';
import {
  orderProjectSelectionProjects,
  resolveProjectSelection,
  type ProjectSelectionAccessors,
  type ProjectSelectionCandidate,
  type ProjectSelectionResolution,
} from '@odh-dashboard/foundation';
import { projectSelectionStorage, type ProjectSelectionStorage } from './projectSelectionStorage';

export type { ProjectSelectionCandidate } from '@odh-dashboard/foundation';

const absentRouteCandidate: ProjectSelectionCandidate = { status: 'absent' };
const noProviderValidatedProjects: readonly never[] = [];

type UseProjectSelectionOptions<T> = {
  projects: readonly T[] | null;
  providerValidatedProjects?: readonly T[];
  routeCandidate?: ProjectSelectionCandidate;
  accessors: ProjectSelectionAccessors<T>;
  isAiProject: (project: T) => boolean;
  validateCandidate?: (projectName: string, signal: AbortSignal) => Promise<T | null>;
  storage?: ProjectSelectionStorage;
  enablePersistence?: boolean;
};

type UseProjectSelectionResult<T> = {
  orderedProjects: T[];
  activeProject: T | null;
  resolution: ProjectSelectionResolution<T>;
  selectProject: (project: T | null) => void;
};

const mergeProjectsByName = <T>(
  projects: readonly T[],
  additionalProjects: readonly T[],
  getName: (project: T) => string,
): T[] => {
  const merged = new Map(projects.map((project) => [getName(project), project]));
  additionalProjects.forEach((project) => merged.set(getName(project), project));
  return [...merged.values()];
};

export const useProjectSelection = <T>({
  projects,
  providerValidatedProjects,
  routeCandidate = absentRouteCandidate,
  accessors,
  isAiProject,
  validateCandidate,
  storage = projectSelectionStorage,
  enablePersistence = true,
}: UseProjectSelectionOptions<T>): UseProjectSelectionResult<T> => {
  const [storedProjectName, setStoredProjectName] = React.useState<string | null>(() =>
    enablePersistence ? storage.read() : null,
  );
  const [activeProjectName, setActiveProjectName] = React.useState<string | null>(null);
  const [validatedCandidateProjects, setValidatedCandidateProjects] = React.useState<T[]>([]);
  const [externalProjectName, setExternalProjectName] = React.useState<string | null>(null);
  const knownProviderProjects = providerValidatedProjects ?? noProviderValidatedProjects;
  const listAvailable = projects !== null;

  React.useEffect(() => {
    setExternalProjectName(null);
    setStoredProjectName(enablePersistence ? storage.read() : null);
  }, [enablePersistence, storage]);

  React.useEffect(() => {
    if (listAvailable && validatedCandidateProjects.length > 0) {
      setValidatedCandidateProjects([]);
    }
  }, [listAvailable, validatedCandidateProjects.length]);

  const orderedProjects = React.useMemo(
    () =>
      orderProjectSelectionProjects(
        projects ??
          mergeProjectsByName(validatedCandidateProjects, knownProviderProjects, accessors.getName),
        accessors,
      ),
    [accessors, knownProviderProjects, projects, validatedCandidateProjects],
  );
  const activeProject = React.useMemo(
    () =>
      activeProjectName
        ? orderedProjects.find((project) => accessors.getName(project) === activeProjectName) ??
          null
        : null,
    [accessors, activeProjectName, orderedProjects],
  );

  const resolution = React.useMemo(
    () =>
      resolveProjectSelection({
        list:
          projects === null
            ? {
                status: 'list-unavailable',
                providerValidatedProjects: orderedProjects,
              }
            : { status: 'available', projects: orderedProjects },
        routeCandidate,
        storedProjectName,
        activeProject,
        getName: accessors.getName,
        isAiProject,
      }),
    [
      accessors.getName,
      activeProject,
      isAiProject,
      orderedProjects,
      projects,
      routeCandidate,
      storedProjectName,
    ],
  );

  const routeKey =
    routeCandidate.status === 'present' ? `present:${routeCandidate.name}` : 'absent';
  React.useEffect(() => setExternalProjectName(null), [routeKey]);

  React.useEffect(() => {
    if (externalProjectName) {
      const externalProject = orderedProjects.find(
        (project) => accessors.getName(project) === externalProjectName,
      );
      if (externalProject) {
        if (activeProjectName !== externalProjectName) {
          setActiveProjectName(externalProjectName);
        }
        if (externalProjectName !== storedProjectName) {
          setStoredProjectName(externalProjectName);
        }
        return;
      }
      if (projects === null) {
        return;
      }
      const resolvedProjectName = resolution.activeProject
        ? accessors.getName(resolution.activeProject)
        : null;
      if (activeProjectName !== resolvedProjectName) {
        setActiveProjectName(resolvedProjectName);
      }
      setExternalProjectName(null);
      return;
    }

    const resolvedProjectName = resolution.activeProject
      ? accessors.getName(resolution.activeProject)
      : null;
    if (activeProjectName !== resolvedProjectName) {
      setActiveProjectName(resolvedProjectName);
    }
    if (resolution.status === 'selected' && enablePersistence && resolution.source === 'route') {
      const projectName = accessors.getName(resolution.activeProject);
      if (projectName !== storedProjectName) {
        storage.write(projectName);
        setStoredProjectName(projectName);
      }
    }
  }, [
    accessors,
    activeProjectName,
    enablePersistence,
    externalProjectName,
    orderedProjects,
    projects,
    resolution,
    storage,
    storedProjectName,
  ]);

  const pendingExternalProjectName =
    projects === null &&
    externalProjectName &&
    !orderedProjects.some((project) => accessors.getName(project) === externalProjectName)
      ? externalProjectName
      : null;
  const pendingCandidate =
    externalProjectName !== null
      ? pendingExternalProjectName
      : resolution.status === 'pending-validation'
      ? resolution.candidate
      : null;
  React.useEffect(() => {
    if (!pendingCandidate || !validateCandidate) {
      return undefined;
    }
    const controller = new AbortController();
    const clearExternalCandidate = (): void => {
      if (pendingExternalProjectName && !controller.signal.aborted) {
        setExternalProjectName((current) =>
          current === pendingExternalProjectName ? activeProjectName : current,
        );
      }
    };
    void validateCandidate(pendingCandidate, controller.signal)
      .then((validatedProject) => {
        if (
          validatedProject &&
          accessors.getName(validatedProject) === pendingCandidate &&
          !controller.signal.aborted
        ) {
          setValidatedCandidateProjects((current) =>
            mergeProjectsByName(current, [validatedProject], accessors.getName),
          );
        } else {
          clearExternalCandidate();
        }
      })
      .catch(clearExternalCandidate);
    return () => controller.abort();
  }, [
    accessors,
    activeProjectName,
    pendingCandidate,
    pendingExternalProjectName,
    validateCandidate,
  ]);

  React.useEffect(() => {
    if (!enablePersistence) {
      return undefined;
    }
    return storage.subscribe((projectName) => {
      if (!projectName) {
        if (orderedProjects.length === 0) {
          setExternalProjectName(null);
          setStoredProjectName(null);
          setActiveProjectName(null);
        }
        return;
      }
      if (orderedProjects.some((project) => accessors.getName(project) === projectName)) {
        setExternalProjectName(projectName);
        return;
      }
      if (projects === null) {
        setExternalProjectName(projectName);
      }
    });
  }, [accessors, enablePersistence, orderedProjects, projects, storage]);

  const selectProject = React.useCallback(
    (project: T | null) => {
      if (!project) {
        if (orderedProjects.length > 0) {
          return;
        }
        setExternalProjectName(null);
        if (enablePersistence) {
          storage.remove();
        }
        setStoredProjectName(null);
        setActiveProjectName(null);
        return;
      }
      setExternalProjectName(null);
      const projectName = accessors.getName(project);
      const selectableProject = orderedProjects.find(
        (candidate) => accessors.getName(candidate) === projectName,
      );
      if (!selectableProject) {
        return;
      }
      setActiveProjectName(projectName);
      if (enablePersistence) {
        storage.write(projectName);
      }
      setStoredProjectName(projectName);
    },
    [accessors, enablePersistence, orderedProjects, storage],
  );

  return {
    orderedProjects,
    activeProject,
    resolution,
    selectProject,
  };
};

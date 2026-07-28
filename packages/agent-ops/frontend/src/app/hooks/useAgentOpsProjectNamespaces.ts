import * as React from 'react';
import { isAvailableProject } from '@odh-dashboard/k8s-core';
import type { Namespace } from '@odh-dashboard/internal/types';
import { useNamespaceSelector } from 'mod-arch-core';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';

export const AGENT_OPS_PROJECTS_LOAD_ERROR_MESSAGE = 'Failed to load projects';

export const logAgentOpsProjectsLoadError = (error: Error): void => {
  // eslint-disable-next-line no-console -- log federated bridge errors for diagnostics only
  console.error('Failed to load agent-ops projects', error);
};

const toNamespace = (name: string, displayName?: string): Namespace => ({
  name,
  displayName: displayName || name,
});

/** Ensures the current namespace appears in the list while bridge/selector data is loading. */
export const getEffectiveProjectNamespaces = (
  projectNamespaces: Namespace[],
  isLoading: boolean,
  fallbackNamespace?: string,
): Namespace[] => {
  if (projectNamespaces.length > 0) {
    return projectNamespaces;
  }
  if (isLoading && fallbackNamespace) {
    return [{ name: fallbackNamespace, displayName: fallbackNamespace }];
  }
  return projectNamespaces;
};

export const useAgentOpsProjectNamespaces = (): {
  projectNamespaces: Namespace[];
  isLoading: boolean;
  loadError: Error | null;
  onProjectSelection: (projectName: string) => void;
} => {
  const {
    bridgeActive,
    projects: bridgeProjects,
    loaded: bridgeLoaded,
    loadError: bridgeLoadError,
    updatePreferredProject,
  } = useProjectsBridge();
  const { namespaces, namespacesLoaded, namespacesLoadError, updatePreferredNamespace } =
    useNamespaceSelector();

  const filteredNamespaces = React.useMemo(
    () =>
      namespaces
        .filter((namespace) => isAvailableProject(namespace.name, ''))
        .map((namespace) => toNamespace(namespace.name, namespace.displayName)),
    [namespaces],
  );

  const bridgedNamespaces = React.useMemo(
    () => bridgeProjects.map((project) => toNamespace(project.name, project.displayName)),
    [bridgeProjects],
  );

  const bridgeIsLoading = bridgeActive && !bridgeLoaded && !bridgeLoadError;
  const bridgeHasProjects = bridgeActive && bridgeLoaded && bridgeProjects.length > 0;

  const projectNamespaces = bridgeHasProjects
    ? bridgedNamespaces
    : bridgeActive
      ? []
      : filteredNamespaces;

  const isLoading = bridgeActive ? bridgeIsLoading : !namespacesLoaded && !namespacesLoadError;
  const loadError = bridgeLoadError ?? (bridgeActive ? null : (namespacesLoadError ?? null));

  const lastLoggedErrorRef = React.useRef<Error | null>(null);
  React.useEffect(() => {
    if (loadError && loadError !== lastLoggedErrorRef.current) {
      logAgentOpsProjectsLoadError(loadError);
      lastLoggedErrorRef.current = loadError;
    }
    if (!loadError) {
      lastLoggedErrorRef.current = null;
    }
  }, [loadError]);

  const onProjectSelection = React.useCallback(
    (projectName: string) => {
      if (bridgeActive) {
        updatePreferredProject(projectName ? { name: projectName } : null);
        return;
      }

      const match = projectName
        ? (namespaces.find((namespace) => namespace.name === projectName) ?? undefined)
        : undefined;
      updatePreferredNamespace(match);
    },
    [bridgeActive, namespaces, updatePreferredProject, updatePreferredNamespace],
  );

  return {
    projectNamespaces,
    isLoading,
    loadError,
    onProjectSelection,
  };
};

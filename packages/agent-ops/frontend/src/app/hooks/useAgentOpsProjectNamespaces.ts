import * as React from 'react';
import { isAvailableProject } from '@odh-dashboard/internal/concepts/projects/utils';
import type { Namespace } from '@odh-dashboard/internal/types';
import { useNamespaceSelector } from 'mod-arch-core';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';

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
    onProjectSelection,
  };
};

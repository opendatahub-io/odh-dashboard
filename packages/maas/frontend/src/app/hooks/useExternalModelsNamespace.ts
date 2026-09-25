import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { ProjectsContext } from '@odh-dashboard/ui-core';

export type UseExternalModelsNamespaceResult = {
  /** Raw `:namespace` segment from the URL, if present. */
  urlNamespace: string | undefined;
  /** Namespace to use for API calls and UI — valid URL param, or preferred/first project. */
  resolvedNamespace: string | undefined;
  /** True once namespaces have loaded and the user has none. */
  noProjects: boolean;
  namespacesLoaded: boolean;
  namespacesLoadError: Error | undefined;
  /** True when URL namespace is missing or invalid and we should redirect to canonical path. */
  shouldRedirect: boolean;
};

/**
 * Resolves the active external-models namespace.
 *
 * Prefers host {@link ProjectsContext} when provided (federated / ODH dashboard): that list is
 * K8s-watched, so creating a project updates `noProjects` without a full page reload.
 * Falls back to ModularArch `useNamespaceSelector` for standalone / when the host provider is absent.
 */
export function useExternalModelsNamespace(): UseExternalModelsNamespaceResult {
  const params = useParams<{ namespace?: string }>();
  const urlNamespace = params.namespace;

  const {
    projects,
    preferredProject,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);

  const {
    namespaces,
    namespacesLoaded: modArchLoaded,
    preferredNamespace,
    namespacesLoadError: modArchError,
  } = useNamespaceSelector();

  // Default context value uses this when no host ProjectsContext.Provider is mounted.
  const hostProjectsAvailable =
    projectsLoadError?.message !== 'Not in project provider' &&
    (projectsLoaded || projectsLoadError !== undefined);

  if (hostProjectsAvailable) {
    const noProjects = projectsLoaded && projects.length === 0;

    const validUrlNamespace =
      urlNamespace && projects.some((p) => p.metadata.name === urlNamespace)
        ? urlNamespace
        : undefined;

    const fallbackNamespace = preferredProject?.metadata.name ?? projects[0]?.metadata.name;
    const resolvedNamespace = validUrlNamespace ?? fallbackNamespace;

    const shouldRedirect =
      projectsLoaded && !noProjects && !!resolvedNamespace && resolvedNamespace !== urlNamespace;

    return {
      urlNamespace,
      resolvedNamespace,
      noProjects,
      namespacesLoaded: projectsLoaded,
      namespacesLoadError: projectsLoadError,
      shouldRedirect,
    };
  }

  const noProjects = modArchLoaded && namespaces.length === 0;

  const validUrlNamespace =
    urlNamespace && namespaces.some((ns) => ns.name === urlNamespace) ? urlNamespace : undefined;

  const fallbackNamespace = preferredNamespace?.name ?? namespaces[0]?.name;
  const resolvedNamespace = validUrlNamespace ?? fallbackNamespace;

  const shouldRedirect =
    modArchLoaded && !noProjects && !!resolvedNamespace && resolvedNamespace !== urlNamespace;

  return {
    urlNamespace,
    resolvedNamespace,
    noProjects,
    namespacesLoaded: modArchLoaded,
    namespacesLoadError: modArchError,
    shouldRedirect,
  };
}

import { useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';

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

export function useExternalModelsNamespace(): UseExternalModelsNamespaceResult {
  const { namespace: urlNamespace } = useParams<{ namespace?: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace, namespacesLoadError } =
    useNamespaceSelector();

  const noProjects = namespacesLoaded && namespaces.length === 0;

  const validUrlNamespace =
    urlNamespace && namespaces.some((ns) => ns.name === urlNamespace) ? urlNamespace : undefined;

  const fallbackNamespace = preferredNamespace?.name ?? namespaces[0]?.name;
  const resolvedNamespace = validUrlNamespace ?? fallbackNamespace;

  const shouldRedirect =
    namespacesLoaded && !noProjects && !!resolvedNamespace && resolvedNamespace !== urlNamespace;

  return {
    urlNamespace,
    resolvedNamespace,
    noProjects,
    namespacesLoaded,
    namespacesLoadError,
    shouldRedirect,
  };
}

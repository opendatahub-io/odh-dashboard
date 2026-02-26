import * as React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { evaluationRootSegment } from '~/app/routes';

/**
 * Mirrors the GenAiCoreLoader pattern from packages/gen-ai.
 *
 * Responsibilities:
 *   - If namespaces are still loading → show a spinner.
 *   - If no namespaces exist → show an empty state.
 *   - If no namespace in the URL → redirect to the preferred (or first) namespace.
 *   - If an invalid namespace is in the URL → redirect to the preferred namespace.
 *   - If a valid namespace is in the URL → render the nested route via <Outlet>.
 *
 * The redirect target is built from `useLocation().pathname` so the /evaluation
 * prefix is always preserved (e.g. '/evaluation/my-ns/new' → evalBase '/evaluation').
 */
const EvalCoreLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { pathname } = useLocation();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  // Extract the /evaluation prefix from the current path so navigation works
  // in both standalone (app at /) and federated (app at /develop-train/eval-hub).
  // e.g. '/develop-train/eval-hub/evaluation/my-ns/new' → '/develop-train/eval-hub/evaluation'
  const evalBase = React.useMemo(() => {
    const marker = `/${evaluationRootSegment}`;
    const idx = pathname.lastIndexOf(marker);
    return idx === -1 ? pathname : pathname.slice(0, idx + marker.length);
  }, [pathname]);

  if (!namespacesLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (namespaces.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>
          No namespaces available. Contact your administrator to request access.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  // At least one namespace is available — redirectNamespace is always defined.
  const redirectNamespace = preferredNamespace ?? namespaces[0];

  if (namespace) {
    const foundNamespace = namespaces.find((n) => n.name === namespace);
    if (foundNamespace) {
      // Valid namespace — render the matched child route.
      return <Outlet />;
    }
    // Invalid namespace — redirect to preferred namespace.
    return <Navigate to={`${evalBase}/${redirectNamespace.name}`} replace />;
  }

  // No namespace in URL — redirect to preferred namespace.
  return <Navigate to={`${evalBase}/${redirectNamespace.name}`} replace />;
};

export default EvalCoreLoader;

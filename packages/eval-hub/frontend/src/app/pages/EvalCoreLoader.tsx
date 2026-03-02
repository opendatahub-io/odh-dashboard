import * as React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { evaluationRootSegment } from '~/app/routes';

const EvalCoreLoader: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { pathname } = useLocation();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

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

  const redirectNamespace = preferredNamespace ?? namespaces[0];

  if (namespace) {
    const foundNamespace = namespaces.find((n) => n.name === namespace);
    if (foundNamespace) {
      return <Outlet />;
    }
    return <Navigate to={`${evalBase}/${redirectNamespace.name}`} replace />;
  }

  return <Navigate to={`${evalBase}/${redirectNamespace.name}`} replace />;
};

export default EvalCoreLoader;

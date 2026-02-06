import { useNamespaceSelector } from 'mod-arch-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';

export function usePreferredNamespaceRedirect(): void {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { namespaces, preferredNamespace } = useNamespaceSelector();

  React.useEffect(() => {
    if (!namespace) {
      navigate(preferredNamespace?.name ?? namespaces[0]?.name, { replace: true });
    }
  }, [namespace, namespaces, navigate, preferredNamespace]);
}

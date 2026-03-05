import { useNamespaceSelector } from 'mod-arch-core';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

export function usePreferredNamespaceRedirect(): void {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { namespaces, preferredNamespace } = useNamespaceSelector();

  useEffect(() => {
    const preferredOrFirstNamespace = preferredNamespace?.name ?? namespaces[0]?.name;
    if (!namespace && preferredOrFirstNamespace) {
      navigate(preferredOrFirstNamespace, { replace: true });
    }
  }, [namespace, namespaces, navigate, preferredNamespace]);
}

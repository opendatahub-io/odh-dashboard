import { useNamespaceSelector } from 'mod-arch-core';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

export function usePreferredNamespaceRedirect(): void {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { namespaces, preferredNamespace } = useNamespaceSelector({ storeLastNamespace: true });

  useEffect(() => {
    const validPreferredName = namespaces.find((n) => n.name === preferredNamespace?.name)?.name;
    const preferredOrFirstNamespace = validPreferredName ?? namespaces[0]?.name;
    if (!namespace && preferredOrFirstNamespace) {
      navigate(preferredOrFirstNamespace, { replace: true });
    }
  }, [namespace, namespaces, navigate, preferredNamespace]);
}

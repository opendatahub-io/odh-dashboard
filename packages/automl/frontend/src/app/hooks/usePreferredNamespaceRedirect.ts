import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';

export function usePreferredNamespaceRedirect(): void {
  const { namespace } = useParams();
  const navigate = useNavigate();

  const { namespaces, preferredNamespace } = useNamespaceSelectorWithPersistence();

  useEffect(() => {
    const validPreferredName = namespaces.find((n) => n.name === preferredNamespace?.name)?.name;
    const preferredOrFirstNamespace = validPreferredName ?? namespaces[0]?.name;
    if (!namespace && preferredOrFirstNamespace) {
      navigate(preferredOrFirstNamespace, { replace: true });
    }
  }, [namespace, namespaces, navigate, preferredNamespace]);
}

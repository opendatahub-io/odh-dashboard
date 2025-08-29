import * as React from 'react';
import { getNamespaces } from '~/app/services/llamaStackService';
import { NamespaceModel } from '~/app/types';

/**
 * Hook to fetch namespaces from the Llama Stack GenAI endpoint.
 * @returns Object containing namespaces array, loading state, and error state
 */
export const useGenaiNamespaces = (): {
  namespaces: NamespaceModel[];
  namespacesLoaded: boolean;
  namespacesLoadError: Error | null;
} => {
  const [namespaces, setNamespaces] = React.useState<NamespaceModel[]>([]);
  const [namespacesLoaded, setNamespacesLoaded] = React.useState(false);
  const [namespacesLoadError, setNamespacesLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchNamespaces = async () => {
      setNamespacesLoaded(false);
      setNamespacesLoadError(null);

      try {
        const data = await getNamespaces();
        setNamespaces(data);
      } catch (error) {
        setNamespacesLoadError(
          error instanceof Error ? error : new Error('Unknown error fetching namespaces'),
        );
      } finally {
        setNamespacesLoaded(true);
      }
    };

    fetchNamespaces();
  }, []);

  return { namespaces, namespacesLoaded, namespacesLoadError };
};

export default useGenaiNamespaces;

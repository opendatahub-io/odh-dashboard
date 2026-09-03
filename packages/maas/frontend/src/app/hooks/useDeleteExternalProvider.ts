import * as React from 'react';
import { deleteExternalProvider } from '~/app/api/external-models';

type UseDeleteExternalProviderReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteExternalProviderCallback: (name: string) => Promise<void>;
};

export const useDeleteExternalProvider = (namespace: string): UseDeleteExternalProviderReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteExternalProviderCallback = React.useCallback(
    async (name: string): Promise<void> => {
      setIsDeleting(true);
      setError(undefined);

      try {
        await deleteExternalProvider()({}, namespace, name);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete external provider'));
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    [namespace],
  );

  return {
    isDeleting,
    error,
    deleteExternalProviderCallback,
  };
};

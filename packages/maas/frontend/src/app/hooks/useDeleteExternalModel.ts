import * as React from 'react';
import { deleteExternalModel } from '~/app/api/external-models';

type UseDeleteExternalModelReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteExternalModelCallback: (name: string) => Promise<void>;
};

export const useDeleteExternalModel = (namespace: string): UseDeleteExternalModelReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteExternalModelCallback = React.useCallback(
    async (name: string): Promise<void> => {
      setIsDeleting(true);
      setError(undefined);

      try {
        await deleteExternalModel()({}, namespace, name);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete external model'));
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
    deleteExternalModelCallback,
  };
};

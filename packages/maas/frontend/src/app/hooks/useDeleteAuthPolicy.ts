import * as React from 'react';
import { deleteAuthPolicy } from '~/app/api/auth-policies';

type UseDeleteAuthPolicyReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteAuthPolicyCallback: (name: string) => Promise<void>;
};

export const useDeleteAuthPolicy = (): UseDeleteAuthPolicyReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteAuthPolicyCallback = React.useCallback(async (name: string): Promise<void> => {
    setIsDeleting(true);
    setError(undefined);

    try {
      await deleteAuthPolicy()({}, name);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete auth policy'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    isDeleting,
    error,
    deleteAuthPolicyCallback,
  };
};

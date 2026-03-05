import * as React from 'react';
import { deleteApiKey } from '~/app/api/api-keys';

type UseDeleteApiKeyReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteApiKeyCallback: (apiKeyName: string) => Promise<void>;
};

const useDeleteApiKey = (): UseDeleteApiKeyReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteApiKeyCallback = React.useCallback(async (apiKeyName: string): Promise<void> => {
    setIsDeleting(true);
    setError(undefined);

    try {
      await deleteApiKey()({}, apiKeyName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revoke API key'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    isDeleting,
    error,
    deleteApiKeyCallback,
  };
};

export default useDeleteApiKey;

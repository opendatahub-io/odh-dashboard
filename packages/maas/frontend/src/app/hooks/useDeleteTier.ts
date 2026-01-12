import * as React from 'react';
import { deleteTier } from '~/app/api/tiers';

type UseDeleteTierReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteTierCallback: (tierName: string) => Promise<void>;
};

const useDeleteTier = (): UseDeleteTierReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteTierCallback = React.useCallback(async (tierName: string): Promise<void> => {
    setIsDeleting(true);
    setError(undefined);

    try {
      await deleteTier()({}, tierName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete tier'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    isDeleting,
    error,
    deleteTierCallback,
  };
};

export default useDeleteTier;

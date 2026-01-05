import * as React from 'react';
import { deleteTier } from '~/app/api/tiers';

type UseDeleteTierReturn = {
  isDeleting: boolean;
  error: string | null;
  deleteTierCallback: (tierName: string) => Promise<void>;
};

const useDeleteTier = (): UseDeleteTierReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const deleteTierCallback = React.useCallback(async (tierName: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteTier()({}, tierName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tier';
      setError(errorMessage);
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

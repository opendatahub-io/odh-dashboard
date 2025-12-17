import * as React from 'react';
import { Tier } from '~/app/types/tier';
import { updateTier } from '~/app/api/tiers';

type UseUpdateTierReturn = {
  isUpdating: boolean;
  error: string | null;
  updateTierCallback: (tier: Tier) => Promise<void>;
};

const useUpdateTier = (): UseUpdateTierReturn => {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateTierCallback = React.useCallback(async (tier: Tier): Promise<void> => {
    setIsUpdating(true);
    setError(null);

    try {
      await updateTier()({}, tier.name ?? '', tier);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tier';
      setError(errorMessage);
      throw err; // Re-throw so the caller knows it failed
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    isUpdating,
    error,
    updateTierCallback,
  };
};

export default useUpdateTier;

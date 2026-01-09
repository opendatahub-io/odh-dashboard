import * as React from 'react';
import { Tier } from '~/app/types/tier';
import { createTier } from '~/app/api/tiers';

type UseCreateTierReturn = {
  isCreating: boolean;
  error: string | null;
  createTierCallback: (tier: Tier) => Promise<void>;
};

const useCreateTier = (): UseCreateTierReturn => {
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createTierCallback = React.useCallback(async (tier: Tier): Promise<void> => {
    setIsCreating(true);
    setError(null);

    try {
      await createTier()({}, tier);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tier';
      setError(errorMessage);
      throw err; // Re-throw so the caller knows it failed
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    isCreating,
    error,
    createTierCallback,
  };
};

export default useCreateTier;

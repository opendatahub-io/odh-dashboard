import * as React from 'react';
import { deleteSubscription } from '../api/subscriptions';

type UseDeleteSubscriptionReturn = {
  isDeleting: boolean;
  error: Error | undefined;
  deleteSubscriptionCallback: (name: string) => Promise<void>;
};

export const useDeleteSubscription = (): UseDeleteSubscriptionReturn => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const deleteSubscriptionCallback = React.useCallback(async (name: string): Promise<void> => {
    setIsDeleting(true);
    setError(undefined);

    try {
      await deleteSubscription()({}, name);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete subscription'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    isDeleting,
    error,
    deleteSubscriptionCallback,
  };
};

import * as React from 'react';
import { createExternalProvider } from '~/app/api/external-models';

type UseCreateExternalProviderReturn = {
  isCreating: boolean;
  error: Error | undefined;
  createExternalProviderCallback: (
    request: Parameters<ReturnType<typeof createExternalProvider>>[1],
  ) => Promise<void>;
};

export const useCreateExternalProvider = (): UseCreateExternalProviderReturn => {
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const createExternalProviderCallback = React.useCallback(
    async (request: Parameters<ReturnType<typeof createExternalProvider>>[1]): Promise<void> => {
      setIsCreating(true);
      setError(undefined);

      try {
        await createExternalProvider()({}, request);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create external provider'));
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return {
    isCreating,
    error,
    createExternalProviderCallback,
  };
};

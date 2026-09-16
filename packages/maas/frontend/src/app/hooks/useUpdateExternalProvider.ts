import * as React from 'react';
import { updateExternalProvider } from '~/app/api/external-models';
import { UpdateExternalProviderRequest } from '~/app/types/external-models';

type UseUpdateExternalProviderReturn = {
  isUpdating: boolean;
  error: Error | undefined;
  updateExternalProviderCallback: (
    namespace: string,
    name: string,
    request: UpdateExternalProviderRequest,
  ) => Promise<void>;
};

export const useUpdateExternalProvider = (): UseUpdateExternalProviderReturn => {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const updateExternalProviderCallback = React.useCallback(
    async (
      namespace: string,
      name: string,
      request: UpdateExternalProviderRequest,
    ): Promise<void> => {
      setIsUpdating(true);
      setError(undefined);

      try {
        await updateExternalProvider()({}, namespace, name, request);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update external provider'));
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return {
    isUpdating,
    error,
    updateExternalProviderCallback,
  };
};

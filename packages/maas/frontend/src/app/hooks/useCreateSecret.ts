import * as React from 'react';
import { createSecret } from '~/app/api/external-models';
import { CreateSecretRequest } from '~/app/types/external-models';

type UseCreateSecretReturn = {
  isCreating: boolean;
  error: Error | undefined;
  createSecretCallback: (request: CreateSecretRequest) => Promise<void>;
};

export const useCreateSecret = (): UseCreateSecretReturn => {
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const createSecretCallback = React.useCallback(async (request: CreateSecretRequest) => {
    setIsCreating(true);
    setError(undefined);

    try {
      await createSecret()({}, request);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create secret'));
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    isCreating,
    error,
    createSecretCallback,
  };
};

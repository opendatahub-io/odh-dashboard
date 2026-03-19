import * as React from 'react';
import { revokeApiKey } from '~/app/api/api-keys';

type UseRevokeApiKeyReturn = {
  isRevoking: boolean;
  error: Error | undefined;
  revokeApiKeyCallback: (apiKeyName: string) => Promise<void>;
};

const useRevokeApiKey = (): UseRevokeApiKeyReturn => {
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const revokeApiKeyCallback = React.useCallback(async (apiKeyName: string): Promise<void> => {
    setIsRevoking(true);
    setError(undefined);

    try {
      await revokeApiKey()({}, apiKeyName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revoke API key'));
      throw err;
    } finally {
      setIsRevoking(false);
    }
  }, []);

  return {
    isRevoking,
    error,
    revokeApiKeyCallback,
  };
};

export default useRevokeApiKey;

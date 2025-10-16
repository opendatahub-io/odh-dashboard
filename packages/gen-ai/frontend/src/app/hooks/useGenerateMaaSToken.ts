import * as React from 'react';
import { MaaSTokenResponse } from '~/app/types';
import { generateMaaSToken } from '~/app/services/llamaStackService';

type UseGenerateMaaSTokenReturn = {
  isGenerating: boolean;
  tokenData: MaaSTokenResponse | null;
  error: string | null;
  generateToken: (namespace: string, expiration?: string) => Promise<void>;
  resetToken: () => void;
};

const useGenerateMaaSToken = (): UseGenerateMaaSTokenReturn => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [tokenData, setTokenData] = React.useState<MaaSTokenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generateToken = React.useCallback(async (namespace: string, expiration?: string) => {
    setIsGenerating(true);
    setError(null);
    setTokenData(null);

    try {
      const response = await generateMaaSToken(namespace, expiration);
      setTokenData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate MaaS token';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const resetToken = React.useCallback(() => {
    setTokenData(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    isGenerating,
    tokenData,
    error,
    generateToken,
    resetToken,
  };
};

export default useGenerateMaaSToken;

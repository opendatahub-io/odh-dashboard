import * as React from 'react';
import { NotReadyError } from 'mod-arch-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { MaaSTokenResponse } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

type UseGenerateMaaSTokenReturn = {
  isGenerating: boolean;
  tokenData: MaaSTokenResponse | null;
  error: string | null;
  generateToken: (expiration?: string) => Promise<void>;
  resetToken: () => void;
};

const useGenerateMaaSToken = (): UseGenerateMaaSTokenReturn => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [tokenData, setTokenData] = React.useState<MaaSTokenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { api, apiAvailable } = useGenAiAPI();

  const generateToken = React.useCallback(
    async (expiration?: string) => {
      setIsGenerating(true);
      setError(null);
      setTokenData(null);
      if (!apiAvailable) {
        setIsGenerating(false);
        throw new NotReadyError('API not yet available');
      }

      try {
        const response = await api.generateMaaSToken(expiration ? { expiration } : {});
        setTokenData(response);
        try {
          fireFormTrackingEvent('Available Endpoints MaaS Token Generated', {
            outcome: TrackingOutcome.submit,
            success: true,
            assetType: 'maas_model',
            copyTarget: 'service_token',
          });
        } catch {
          // Swallow tracking errors to prevent them from affecting hook state
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate MaaS token';
        setError(errorMessage);
        try {
          fireFormTrackingEvent('Available Endpoints MaaS Token Generated', {
            outcome: TrackingOutcome.submit,
            success: false,
            error: errorMessage,
            assetType: 'maas_model',
            copyTarget: 'service_token',
          });
        } catch {
          // Swallow tracking errors to prevent them from affecting hook state
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [api, apiAvailable],
  );

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

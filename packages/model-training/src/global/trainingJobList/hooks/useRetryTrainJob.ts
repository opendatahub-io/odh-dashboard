import * as React from 'react';
import { retryTrainJob } from '../../../api';
import { TrainJobKind } from '../../../k8sTypes';

type UseRetryTrainJobResult = {
  retryJob: () => Promise<void>;
  isRetrying: boolean;
  error: Error | null;
};

export const useRetryTrainJob = (job: TrainJobKind): UseRetryTrainJobResult => {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const retryJob = React.useCallback(async () => {
    setIsRetrying(true);
    setError(null);

    try {
      await retryTrainJob(job);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to retry job');
      setError(errorMessage);
      throw errorMessage;
    } finally {
      setIsRetrying(false);
    }
  }, [job]);

  return {
    retryJob,
    isRetrying,
    error,
  };
};

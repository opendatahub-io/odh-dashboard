import * as React from 'react';
import { pauseTrainJob } from '../../../api/scaling';
import { TrainJobKind } from '../../../k8sTypes';

type UsePauseTrainJobResult = {
  pauseJob: () => Promise<void>;
  isPausing: boolean;
  error: Error | null;
};

export const usePauseTrainJob = (job: TrainJobKind | null): UsePauseTrainJobResult => {
  const [isPausing, setIsPausing] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const pauseJob = React.useCallback(async () => {
    if (!job) {
      setError(new Error('No job provided'));
      return;
    }

    setIsPausing(true);
    setError(null);

    try {
      const result = await pauseTrainJob(job);
      if (!result.success) {
        throw new Error(result.error || 'Failed to pause job');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(errorMessage);
      throw errorMessage;
    } finally {
      setIsPausing(false);
    }
  }, [job]);

  return { pauseJob, isPausing, error };
};

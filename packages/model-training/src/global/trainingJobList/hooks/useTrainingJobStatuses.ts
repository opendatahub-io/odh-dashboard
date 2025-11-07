import * as React from 'react';
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import { getTrainingJobStatus } from '../utils';
import { TrainJobKind } from '../../../k8sTypes';
import { TrainingJobState } from '../../../types';

/**
 * Custom hook to manage training job statuses with hibernation support
 * @param jobs - Array of TrainJobs to get statuses for
 * @returns Object with status map and update functions
 */
export const useTrainingJobStatuses = (
  jobs: TrainJobKind[],
): {
  jobStatuses: Map<string, TrainingJobState>;
  isLoading: boolean;
  updateJobStatus: (jobId: string, newStatus: TrainingJobState) => void;
  getJobStatus: (job: TrainJobKind) => TrainingJobState | undefined;
  refreshStatuses: () => void;
} => {
  const [jobStatuses, setJobStatuses] = React.useState<Map<string, TrainingJobState>>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);

  // Update all job statuses
  const updateAllStatuses = React.useCallback(async () => {
    if (jobs.length === 0) {
      setJobStatuses(new Map());
      return;
    }

    setIsLoading(true);
    const statusMap = new Map<string, TrainingJobState>();

    try {
      // Use the unified status function for all jobs
      const statusPromises = jobs.map(async (job) => {
        const jobId = job.metadata.uid || job.metadata.name;
        const result = await getTrainingJobStatus(job);
        return { jobId, status: result.status };
      });

      const [successResults] = await allSettledPromises(statusPromises);
      successResults.forEach((result) => {
        statusMap.set(result.value.jobId, result.value.status);
      });

      setJobStatuses(statusMap);
    } catch (error) {
      console.error('Failed to update job statuses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [jobs]);

  // Update status for a specific job
  const updateJobStatus = React.useCallback((jobId: string, newStatus: TrainingJobState) => {
    setJobStatuses((prev) => {
      const updated = new Map(prev);
      updated.set(jobId, newStatus);
      return updated;
    });
  }, []);

  // Get status for a specific job (with fallback)
  const getJobStatus = React.useCallback(
    (job: TrainJobKind): TrainingJobState | undefined => {
      const jobId = job.metadata.uid || job.metadata.name;
      return jobStatuses.get(jobId);
    },
    [jobStatuses],
  );

  // Update statuses when jobs change
  React.useEffect(() => {
    updateAllStatuses();
  }, [updateAllStatuses]);

  return {
    jobStatuses,
    isLoading,
    updateJobStatus,
    getJobStatus,
    refreshStatuses: updateAllStatuses,
  };
};

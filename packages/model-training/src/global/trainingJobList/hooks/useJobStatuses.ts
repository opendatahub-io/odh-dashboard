import * as React from 'react';
import { allSettledPromises } from '@odh-dashboard/internal/utilities/allSettledPromises';
import { getTrainingJobStatus, getRayJobStatus } from '../utils';
import { JobDisplayState, UnifiedJobKind, isRayJob } from '../../../types';

export const useJobStatuses = (
  jobs: UnifiedJobKind[],
): {
  jobStatuses: Map<string, JobDisplayState>;
  isLoading: boolean;
  updateJobStatus: (jobId: string, newStatus: JobDisplayState) => void;
  getJobStatus: (job: UnifiedJobKind) => JobDisplayState | undefined;
  refreshStatuses: () => void;
} => {
  const [jobStatuses, setJobStatuses] = React.useState<Map<string, JobDisplayState>>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);

  const updateAllStatuses = React.useCallback(async () => {
    if (jobs.length === 0) {
      setJobStatuses(new Map());
      return;
    }

    setIsLoading(true);
    const statusMap = new Map<string, JobDisplayState>();

    try {
      const statusPromises = jobs.map(async (job) => {
        const jobId = job.metadata.uid || job.metadata.name;
        if (isRayJob(job)) {
          const result = await getRayJobStatus(job);
          return { jobId, status: result.status };
        }
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

  const updateJobStatus = React.useCallback((jobId: string, newStatus: JobDisplayState) => {
    setJobStatuses((prev) => {
      const updated = new Map(prev);
      updated.set(jobId, newStatus);
      return updated;
    });
  }, []);

  const getJobStatus = React.useCallback(
    (job: UnifiedJobKind): JobDisplayState | undefined => {
      const jobId = job.metadata.uid || job.metadata.name;
      return jobStatuses.get(jobId);
    },
    [jobStatuses],
  );

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

import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import TrainingJobTable from './TrainingJobTable';
import TrainingJobToolbar from './TrainingJobToolbar';
import ScalingNotification from './components/ScalingNotification';
import { initialTrainingJobFilterData, TrainingJobFilterDataType } from './const';
import { getJobStatusFromPyTorchJob, getJobStatusWithHibernation } from './utils';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

type TrainingJobListViewProps = {
  trainingJobs: PyTorchJobKind[];
};

interface ScalingNotificationData {
  job: PyTorchJobKind;
  previousWorkerCount: number;
  newWorkerCount: number;
  wasResumed: boolean;
}

const TrainingJobListView: React.FC<TrainingJobListViewProps> = ({
  trainingJobs: unfilteredTrainingJobs,
}) => {
  const [filterData, setFilterData] = React.useState<TrainingJobFilterDataType>(
    initialTrainingJobFilterData,
  );
  const [jobStatuses, setJobStatuses] = React.useState<Map<string, PyTorchJobState>>(new Map());
  const [scalingNotification, setScalingNotification] =
    React.useState<ScalingNotificationData | null>(null);

  // Update job statuses with hibernation check for all jobs
  React.useEffect(() => {
    const updateStatuses = async () => {
      const statusMap = new Map<string, PyTorchJobState>();

      const statusPromises = unfilteredTrainingJobs.map(async (job) => {
        try {
          const status = await getJobStatusWithHibernation(job);
          return { jobId: job.metadata.uid || job.metadata.name, status };
        } catch {
          return {
            jobId: job.metadata.uid || job.metadata.name,
            status: getJobStatusFromPyTorchJob(job),
          };
        }
      });

      // eslint-disable-next-line no-restricted-properties
      const results = await Promise.allSettled(statusPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          statusMap.set(result.value.jobId, result.value.status);
        }
      });

      setJobStatuses(statusMap);
    };

    updateStatuses();
  }, [unfilteredTrainingJobs]);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialTrainingJobFilterData),
    [setFilterData],
  );

  // Handle status updates from hibernation toggle
  const handleStatusUpdate = React.useCallback((jobId: string, newStatus: PyTorchJobState) => {
    setJobStatuses((prev) => {
      const updated = new Map(prev);
      updated.set(jobId, newStatus);
      return updated;
    });
  }, []);

  // Handle job updates from scaling operations
  const handleJobUpdate = React.useCallback(
    (jobId: string, updatedJob: PyTorchJobKind) => {
      // Store notification data before job update
      const originalJob = unfilteredTrainingJobs.find(
        (job) => (job.metadata.uid || job.metadata.name) === jobId,
      );

      if (originalJob) {
        const previousWorkerCount = originalJob.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
        const newWorkerCount = updatedJob.spec.pytorchReplicaSpecs.Worker?.replicas || 0;

        if (previousWorkerCount !== newWorkerCount) {
          const currentStatus = jobStatuses.get(jobId);
          const wasResumed = currentStatus === PyTorchJobState.RUNNING;

          setScalingNotification({
            job: updatedJob,
            previousWorkerCount,
            newWorkerCount,
            wasResumed,
          });

          // Auto-dismiss notification after 8 seconds
          setTimeout(() => {
            setScalingNotification(null);
          }, 8000);
        }
      }

      // This would typically trigger a refresh of the jobs list
      // In a real implementation, you might call a parent callback or trigger a data refetch
      console.log('Job updated:', { jobId, updatedJob });
    },
    [unfilteredTrainingJobs, jobStatuses],
  );

  const filteredTrainingJobs = React.useMemo(
    () =>
      unfilteredTrainingJobs.filter((job) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const statusFilter = filterData.Status?.toLowerCase();
        const clusterQueueFilter = filterData['Cluster queue']?.toLowerCase();

        if (nameFilter && !getDisplayNameFromK8sResource(job).toLowerCase().includes(nameFilter)) {
          return false;
        }

        if (statusFilter) {
          const jobId = job.metadata.uid || job.metadata.name;
          const jobStatus = jobStatuses.get(jobId) || getJobStatusFromPyTorchJob(job);
          if (!jobStatus.toLowerCase().includes(statusFilter)) {
            return false;
          }
        }

        if (
          clusterQueueFilter &&
          !(job.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '')
            .toLowerCase()
            .includes(clusterQueueFilter)
        ) {
          return false;
        }

        return true;
      }),
    [filterData, unfilteredTrainingJobs, jobStatuses],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <>
      {/* Success notification for scaling operations */}
      {scalingNotification && (
        <ScalingNotification
          job={scalingNotification.job}
          previousWorkerCount={scalingNotification.previousWorkerCount}
          newWorkerCount={scalingNotification.newWorkerCount}
          wasResumed={scalingNotification.wasResumed}
          onClose={() => setScalingNotification(null)}
        />
      )}

      <TrainingJobTable
        trainingJobs={filteredTrainingJobs}
        jobStatuses={jobStatuses}
        onStatusUpdate={handleStatusUpdate}
        onJobUpdate={handleJobUpdate}
        onClearFilters={onClearFilters}
        clearFilters={
          Object.values(filterData).some((value) => !!value) ? onClearFilters : undefined
        }
        toolbarContent={
          <TrainingJobToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
        }
      />
    </>
  );
};

export default TrainingJobListView;

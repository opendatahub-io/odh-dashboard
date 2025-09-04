import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import TrainingJobTable from './TrainingJobTable';
import TrainingJobToolbar from './TrainingJobToolbar';
import { initialTrainingJobFilterData, TrainingJobFilterDataType } from './const';
import { getTrainingJobStatusSync } from './utils';
import { useTrainingJobStatuses } from './hooks/useTrainingJobStatuses';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

type TrainingJobListViewProps = {
  trainingJobs: PyTorchJobKind[];
};

const TrainingJobListView: React.FC<TrainingJobListViewProps> = ({
  trainingJobs: unfilteredTrainingJobs,
}) => {
  const [filterData, setFilterData] = React.useState<TrainingJobFilterDataType>(
    initialTrainingJobFilterData,
  );

  // Use the custom hook for cleaner status management
  const { jobStatuses, updateJobStatus } = useTrainingJobStatuses(unfilteredTrainingJobs);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialTrainingJobFilterData),
    [setFilterData],
  );

  // Handle status updates from hibernation toggle
  const handleStatusUpdate = React.useCallback(
    (jobId: string, newStatus: PyTorchJobState) => {
      updateJobStatus(jobId, newStatus);
    },
    [updateJobStatus],
  );

  // Handle job updates from scaling operations
  const handleJobUpdate = React.useCallback((jobId: string, updatedJob: PyTorchJobKind) => {
    // This would typically trigger a refresh of the jobs list
    // In a real implementation, you might call a parent callback or trigger a data refetch
    console.log('Job updated:', { jobId, updatedJob });
  }, []);

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
          const jobStatus = jobStatuses.get(jobId) || getTrainingJobStatusSync(job);
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
    <TrainingJobTable
      trainingJobs={filteredTrainingJobs}
      jobStatuses={jobStatuses}
      onStatusUpdate={handleStatusUpdate}
      onJobUpdate={handleJobUpdate}
      onClearFilters={onClearFilters}
      clearFilters={Object.values(filterData).some((value) => !!value) ? onClearFilters : undefined}
      toolbarContent={
        <TrainingJobToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default TrainingJobListView;

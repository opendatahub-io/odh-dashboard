import * as React from 'react';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { PyTorchJobKind } from '../../k8sTypes';
import TrainingJobTable from './TrainingJobTable';
import TrainingJobToolbar from './TrainingJobToolbar';
import { initialTrainingJobFilterData, TrainingJobFilterDataType } from './const';
import { getJobStatus } from './utils';

type TrainingJobListViewProps = {
  trainingJobs: PyTorchJobKind[];
};

const TrainingJobListView: React.FC<TrainingJobListViewProps> = ({
  trainingJobs: unfilteredTrainingJobs,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<TrainingJobFilterDataType>(
    initialTrainingJobFilterData,
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialTrainingJobFilterData),
    [setFilterData],
  );

  const filteredTrainingJobs = React.useMemo(
    () =>
      unfilteredTrainingJobs.filter((job) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const statusFilter = filterData.Status?.toLowerCase();
        const queueFilter = filterData.Queue?.toLowerCase();

        if (nameFilter && !getDisplayNameFromK8sResource(job).toLowerCase().includes(nameFilter)) {
          return false;
        }

        if (statusFilter && !getJobStatus(job).toLowerCase().includes(statusFilter)) {
          return false;
        }

        if (
          queueFilter &&
          !(job.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '')
            .toLowerCase()
            .includes(queueFilter)
        ) {
          return false;
        }

        return true;
      }),
    [filterData, unfilteredTrainingJobs, projects],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <TrainingJobTable
      trainingJobs={filteredTrainingJobs}
      onClearFilters={onClearFilters}
      clearFilters={Object.values(filterData).some((value) => !!value) ? onClearFilters : undefined}
      toolbarContent={
        <TrainingJobToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
      }
    />
  );
};

export default TrainingJobListView;

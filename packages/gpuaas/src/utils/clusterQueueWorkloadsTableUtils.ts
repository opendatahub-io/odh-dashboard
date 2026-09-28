import type { ClusterQueueWorkloadsFilterDataType } from '../components/clusterQueueWorkloads/ClusterQueueWorkloadsToolbar';
import type { ClusterQueueWorkloadRow } from '../types';

const getFilterSelectValue = (
  filter?: string | { label: string; value: string },
): string | undefined => (typeof filter === 'string' ? filter : filter?.value);

export const hasActiveWorkloadFilters = (
  filterData: ClusterQueueWorkloadsFilterDataType,
): boolean =>
  Boolean(
    filterData.name?.trim() ||
      getFilterSelectValue(filterData.status) ||
      getFilterSelectValue(filterData.priority) ||
      getFilterSelectValue(filterData.hardwareProfile),
  );

export const filterClusterQueueWorkloads = (
  workloads: ClusterQueueWorkloadRow[],
  filterData: ClusterQueueWorkloadsFilterDataType,
): ClusterQueueWorkloadRow[] => {
  const nameFilter = filterData.name?.trim().toLowerCase();
  const statusValue = getFilterSelectValue(filterData.status);
  const priorityValue = getFilterSelectValue(filterData.priority);
  const hardwareProfileValue = getFilterSelectValue(filterData.hardwareProfile);

  return workloads.filter((workload) => {
    const matchesName =
      !nameFilter ||
      workload.name.toLowerCase().includes(nameFilter) ||
      workload.project.toLowerCase().includes(nameFilter);
    const matchesStatus = !statusValue || workload.status === statusValue;
    const matchesPriority = !priorityValue || workload.priority === priorityValue;
    const matchesHardwareProfile =
      !hardwareProfileValue || workload.hardwareProfile === hardwareProfileValue;
    return matchesName && matchesStatus && matchesPriority && matchesHardwareProfile;
  });
};

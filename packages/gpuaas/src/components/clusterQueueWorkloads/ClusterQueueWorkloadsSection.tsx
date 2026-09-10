import * as React from 'react';
import ClusterQueueWorkloadsTable from './ClusterQueueWorkloadsTable';
import useClusterQueueWorkloads from '../../hooks/useClusterQueueWorkloads';
import type { UseWorkloadRowsOptions } from '../../hooks/useWorkloadRows';

type ClusterQueueWorkloadsSectionProps = {
  clusterQueueName: string;
  showDescription?: boolean;
  /** Controls queue-position polling interval; workload cache stays manual-only. */
  workloadRowsOptions?: UseWorkloadRowsOptions;
};

/**
 * Cluster-queue-scoped workload table for the Quota usage detail panel.
 * Cluster queue column is hidden because the panel context is already scoped to one CQ.
 */
const ClusterQueueWorkloadsSection: React.FC<ClusterQueueWorkloadsSectionProps> = ({
  clusterQueueName,
  showDescription = true,
  workloadRowsOptions,
}) => {
  const { workloads, loaded, error } = useClusterQueueWorkloads(
    clusterQueueName,
    workloadRowsOptions,
  );

  return (
    <ClusterQueueWorkloadsTable
      workloads={workloads}
      loaded={loaded}
      error={error}
      tableId={clusterQueueName}
      showDescription={showDescription}
    />
  );
};

export default ClusterQueueWorkloadsSection;

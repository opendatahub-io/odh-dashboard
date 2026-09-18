import * as React from 'react';
import ClusterQueueWorkloadsTable from './ClusterQueueWorkloadsTable';
import useClusterQueueWorkloads from '../../hooks/useClusterQueueWorkloads';
import type { UseWorkloadRowsOptions } from '../../hooks/useWorkloadRows';

type ClusterQueueWorkloadsSectionProps = {
  clusterQueueName: string;
  workloads?: ReturnType<typeof useClusterQueueWorkloads>['workloads'];
  loaded?: boolean;
  error?: Error;
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
  workloads: providedWorkloads,
  loaded: providedLoaded,
  error: providedError,
  workloadRowsOptions,
}) => {
  const fetched = useClusterQueueWorkloads(
    providedWorkloads ? undefined : clusterQueueName,
    workloadRowsOptions,
  );
  const workloads = providedWorkloads ?? fetched.workloads;
  const loaded = providedLoaded ?? fetched.loaded;
  const error = providedError ?? fetched.error;

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

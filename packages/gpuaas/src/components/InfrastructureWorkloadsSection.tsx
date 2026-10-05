import * as React from 'react';
import WorkloadOverview from './WorkloadOverview';
import type { OverviewBucket, WorkloadOverviewRow } from '../utils/workloadOverview';

type Props = {
  /** The table ticket passes the full, unpaginated rows for the selected project. */
  workloads?: WorkloadOverviewRow[];
  loaded?: boolean;
  partial?: boolean;
  error?: Error;
  onViewInTable?: (bucket: OverviewBucket) => void;
};

/** Overview is a pure consumer of the future table's dataset; no duplicate K8s requests. */
const InfrastructureWorkloadsSection: React.FC<Props> = ({
  workloads,
  loaded,
  partial = false,
  error,
  onViewInTable,
}) => {
  const dataUnavailable = workloads === undefined && loaded === undefined;

  return (
    <WorkloadOverview
      workloads={workloads ?? []}
      loaded={loaded ?? false}
      dataUnavailable={dataUnavailable}
      partial={partial}
      error={error}
      onViewInTable={onViewInTable}
    />
  );
};

export default InfrastructureWorkloadsSection;

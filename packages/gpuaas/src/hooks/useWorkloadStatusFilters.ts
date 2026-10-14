import * as React from 'react';
import type { NotebookState } from '@odh-dashboard/internal/pages/projects/notebook/types';
import type { OverviewBucket, WorkloadOverviewRow } from '../utils/workloadOverview';
import {
  getInfrastructureWorkloadsWithWorkbenchStatus,
  getWorkloadOverviewRow,
} from '../utils/infrastructureWorkloads';
import type { InfrastructureWorkloadRow } from '../types/infrastructureWorkloads';

const uniqueValues = (values: string[]): string[] => [...new Set(values)];

type UseWorkloadStatusFiltersResult = {
  workloads: InfrastructureWorkloadRow[];
  overviewRows: WorkloadOverviewRow[];
  overviewStatusFilters: string[];
  setOverviewStatusFilters: React.Dispatch<React.SetStateAction<string[]>>;
  viewBucketInTable: (bucket: OverviewBucket) => void;
};

const useWorkloadStatusFilters = (
  workloads: InfrastructureWorkloadRow[],
  notebookStates: NotebookState[],
  onViewInTable?: () => void,
): UseWorkloadStatusFiltersResult => {
  const [overviewStatusFilters, setOverviewStatusFilters] = React.useState<string[]>([]);
  const displayWorkloads = React.useMemo(
    () => getInfrastructureWorkloadsWithWorkbenchStatus(workloads, notebookStates),
    [notebookStates, workloads],
  );
  const overviewRows = React.useMemo(
    () => displayWorkloads.flatMap((workload) => getWorkloadOverviewRow(workload) ?? []),
    [displayWorkloads],
  );
  const viewBucketInTable = React.useCallback(
    (bucket: OverviewBucket) => {
      setOverviewStatusFilters(
        uniqueValues(
          overviewRows.filter((row) => row.bucket === bucket).flatMap((row) => row.statusFilters),
        ),
      );
      onViewInTable?.();
    },
    [onViewInTable, overviewRows],
  );

  return {
    workloads: displayWorkloads,
    overviewRows,
    overviewStatusFilters,
    setOverviewStatusFilters,
    viewBucketInTable,
  };
};

export default useWorkloadStatusFilters;

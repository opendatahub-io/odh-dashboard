import * as React from 'react';
import {
  Alert,
  Bullseye,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import ClusterQueueWorkloadTableRow from './ClusterQueueWorkloadTableRow';
import ClusterQueueWorkloadsToolbar, {
  buildWorkloadFilterOptions,
  type ClusterQueueWorkloadsFilterDataType,
} from './ClusterQueueWorkloadsToolbar';
import { getClusterQueueWorkloadsTableColumns } from './clusterQueueWorkloadsTableColumns';
import type { ClusterQueueWorkloadRow } from '../../types';
import {
  CLUSTER_QUEUE_WORKLOADS_EMPTY_BODY,
  CLUSTER_QUEUE_WORKLOADS_EMPTY_TITLE,
  CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION,
} from '../../const';
import { filterClusterQueueWorkloads } from '../../utils/clusterQueueWorkloadsTableUtils';

export type ClusterQueueWorkloadsTableProps = {
  workloads: ClusterQueueWorkloadRow[];
  loaded: boolean;
  error?: Error;
  tableId: string;
  /** Show cluster queue column — use for namespace or cohort-wide views. */
  showClusterQueueColumn?: boolean;
  showDescription?: boolean;
};

const ClusterQueueWorkloadsTable: React.FC<ClusterQueueWorkloadsTableProps> = ({
  workloads,
  loaded,
  error,
  tableId,
  showClusterQueueColumn = false,
  showDescription = true,
}) => {
  const [filterData, setFilterData] = React.useState<ClusterQueueWorkloadsFilterDataType>({});

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) => {
      setFilterData((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterData({});
  }, []);

  const priorityFilterOptions = React.useMemo(
    () => buildWorkloadFilterOptions(workloads.map((workload) => workload.priority)),
    [workloads],
  );
  const hardwareProfileFilterOptions = React.useMemo(
    () => buildWorkloadFilterOptions(workloads.map((workload) => workload.hardwareProfile)),
    [workloads],
  );

  const filteredWorkloads = React.useMemo(
    () => filterClusterQueueWorkloads(workloads, filterData),
    [workloads, filterData],
  );

  const columns = React.useMemo(
    () => getClusterQueueWorkloadsTableColumns({ showClusterQueue: showClusterQueueColumn }),
    [showClusterQueueColumn],
  );

  const workloadEmptyState = (
    <Bullseye data-testid={`cluster-queue-workloads-table-section-${tableId}`}>
      <EmptyState
        headingLevel="h2"
        icon={PlusCircleIcon}
        titleText={CLUSTER_QUEUE_WORKLOADS_EMPTY_TITLE}
        variant={EmptyStateVariant.sm}
        data-testid="cluster-queue-workloads-empty-state"
      >
        <EmptyStateBody>{CLUSTER_QUEUE_WORKLOADS_EMPTY_BODY}</EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );

  if (loaded && workloads.length === 0) {
    if (error) {
      return (
        <Alert
          className="pf-v6-u-mb-md"
          data-testid="cluster-queue-workloads-error"
          variant="danger"
          isInline
          title={error.message}
        />
      );
    }
    return workloadEmptyState;
  }

  return (
    <Stack hasGutter data-testid={`cluster-queue-workloads-table-section-${tableId}`}>
      {showDescription && (
        <StackItem>
          <Content component={ContentVariants.p}>
            {CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION}
          </Content>
        </StackItem>
      )}
      <StackItem>
        {error && (
          <Alert
            className="pf-v6-u-mb-md"
            data-testid="cluster-queue-workloads-error"
            variant="danger"
            isInline
            title={error.message}
          />
        )}
        {!loaded ? (
          <Bullseye className="pf-v6-u-p-lg" data-testid="cluster-queue-workloads-loading">
            <Spinner />
          </Bullseye>
        ) : (
          <Table
            data-testid="cluster-queue-workloads-table"
            aria-label="Cluster queue workloads table"
            id={`cluster-queue-workloads-table-${tableId}`}
            variant="compact"
            enablePagination="compact"
            data={filteredWorkloads}
            columns={columns}
            toolbarContent={
              <ClusterQueueWorkloadsToolbar
                filterData={filterData}
                onFilterUpdate={onFilterUpdate}
                priorityFilterOptions={priorityFilterOptions}
                hardwareProfileFilterOptions={hardwareProfileFilterOptions}
              />
            }
            emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
            onClearFilters={onClearFilters}
            rowRenderer={(workload) => (
              <ClusterQueueWorkloadTableRow
                key={`${workload.namespace}/${workload.name}`}
                workload={workload}
                showClusterQueue={showClusterQueueColumn}
              />
            )}
          />
        )}
      </StackItem>
    </Stack>
  );
};

export default ClusterQueueWorkloadsTable;

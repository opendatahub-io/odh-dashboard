import * as React from 'react';
import { IAction, TableVariant } from '@patternfly/react-table';
import { TableBase, getTableColumnSort, useCheckboxTable } from '#~/components/table';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { experimentColumns } from '#~/concepts/pipelines/content/tables/columns';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineFilter from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { PipelinesFilter } from '#~/concepts/pipelines/types';
import ExperimentTableRow from './ExperimentTableRow';
import { ExperimentTableToolbar } from './ExperimentTableToolbar';

type ExperimentTableProps = {
  experiments: ExperimentKF[];
  loading?: boolean;
  totalSize: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setFilter: (filter?: PipelinesFilter) => void;
  toolbarContentRenderer: (
    selections: string[],
  ) => React.ComponentProps<typeof ExperimentTableToolbar>['children'];
  getActionColumnItems: (experiment: ExperimentKF) => IAction[];
};

const ExperimentTable: React.FC<ExperimentTableProps> = ({
  experiments,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  toolbarContentRenderer,
  setFilter,
  getActionColumnItems,
  ...tableProps
}) => {
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilter(setFilter);
  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCheckboxTable(experiments.map(({ experiment_id: experimentId }) => experimentId));

  return (
    <TableBase
      {...checkboxTableProps}
      loading={loading}
      page={page}
      perPage={pageSize}
      onSetPage={(_, newPage) => {
        if (newPage < page || !loading) {
          setPage(newPage);
        }
      }}
      onPerPageSelect={(_, newSize) => setPageSize(newSize)}
      itemCount={totalSize}
      data={experiments}
      columns={experimentColumns}
      enablePagination="compact"
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      onClearFilters={onClearFilters}
      toolbarContent={
        <ExperimentTableToolbar data-testid="experiment-table-toolbar" {...filterToolbarProps}>
          {toolbarContentRenderer(selections)}
        </ExperimentTableToolbar>
      }
      rowRenderer={(experiment) => (
        <ExperimentTableRow
          key={experiment.experiment_id}
          isChecked={isSelected(experiment.experiment_id)}
          onToggleCheck={() => toggleSelection(experiment.experiment_id)}
          experiment={experiment}
          actionColumnItems={getActionColumnItems(experiment)}
        />
      )}
      getColumnSort={getTableColumnSort({ columns: experimentColumns, ...tableProps })}
      variant={TableVariant.compact}
      data-testid="experiment-table"
    />
  );
};
export default ExperimentTable;

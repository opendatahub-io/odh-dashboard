import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Flex, ToolbarGroup, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';

import { TableBase, getTableColumnSort, useCheckboxTable } from '~/components/table';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { pipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import PipelineRunTableToolbar, {
  FilterProps,
} from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import { FilterOptions } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import { ExperimentKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { experimentsCompareRunsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ManageRunsTableProps = Omit<React.ComponentProps<typeof PipelineRunTable>, 'runType'> & {
  filterProps: FilterProps;
  selectedRunIds: string[];
  experiment: ExperimentKFv2 | null;
};

export const ManageRunsTable: React.FC<ManageRunsTableProps> = ({
  runs,
  experiment,
  selectedRunIds,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  filterProps,
  ...tableProps
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const pageRunIds = runs.map(({ run_id: runId }) => runId);

  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
  } = useCheckboxTable(pageRunIds, selectedRunIds, true);
  const experimentId = experiment?.experiment_id ?? '';

  const rowRenderer = React.useCallback(
    (run: PipelineRunKFv2) => {
      const isChecked = selections.includes(run.run_id);
      const isDisabled = !isChecked && selections.length === 10;

      return (
        <PipelineRunTableRow
          key={run.run_id}
          checkboxProps={{
            isChecked,
            isDisabled,
            onToggle: () => toggleSelection(run.run_id),
            ...(isDisabled && { tooltip: 'Can only compare up to 10 runs' }),
          }}
          hasRowActions={false}
          run={run}
        />
      );
    },
    [selections, toggleSelection],
  );

  return (
    <Flex justifyContent={{ default: 'justifyContentCenter' }} data-testid="manage-runs-table">
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
        data={runs}
        columns={pipelineRunColumns}
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={filterProps.onClearFilters} />}
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid="manage-runs-table-toolbar"
            filterOptions={{
              [FilterOptions.NAME]: 'Run',
              [FilterOptions.EXPERIMENT]: 'Experiment',
              [FilterOptions.PIPELINE_VERSION]: 'Pipeline version',
              [FilterOptions.CREATED_AT]: 'Started',
              [FilterOptions.STATUS]: 'Status',
            }}
            {...filterProps}
          />
        }
        rowRenderer={rowRenderer}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunColumns, ...tableProps })}
        bottomToolbarContent={
          <ToolbarGroup>
            <ToolbarItem>
              <Tooltip content="Select up to 10 runs to compare">
                <Button
                  data-testid="manage-runs-update-button"
                  onClick={() =>
                    navigate(experimentsCompareRunsRoute(namespace, experimentId, selections))
                  }
                  isAriaDisabled={selections.length < 1}
                >
                  Update
                </Button>
              </Tooltip>
            </ToolbarItem>

            <ToolbarItem>
              <Button
                data-testid="manage-runs-cancel-button"
                variant="secondary"
                onClick={() =>
                  navigate(experimentsCompareRunsRoute(namespace, experimentId, selectedRunIds))
                }
              >
                Cancel
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        }
        id="manage-runs-table"
      />
    </Flex>
  );
};

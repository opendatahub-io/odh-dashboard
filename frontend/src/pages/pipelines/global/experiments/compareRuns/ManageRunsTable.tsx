import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Flex, ToolbarGroup, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';

import { TableBase, getTableColumnSort, useCheckboxTable } from '~/components/table';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { pipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTable from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTable';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { compareRunsRoute } from '~/routes/pipelines/runs';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentContext } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { usePipelineFilterSearchParams } from '~/concepts/pipelines/content/tables/usePipelineFilter';

type ManageRunsTableProps = Omit<React.ComponentProps<typeof PipelineRunTable>, 'runType'> & {
  selectedRunIds: string[];
};

export const ManageRunsTable: React.FC<ManageRunsTableProps> = ({
  runs,
  selectedRunIds,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  ...tableProps
}) => {
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const pageRunIds = runs.map(({ run_id: runId }) => runId);
  const { experiment } = React.useContext(ExperimentContext);
  const { onClearFilters, ...filterProps } = usePipelineFilterSearchParams(tableProps.setFilter);

  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
  } = useCheckboxTable(pageRunIds, selectedRunIds, true);

  const rowRenderer = React.useCallback(
    (run: PipelineRunKF) => {
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
        columns={
          experiment
            ? pipelineRunColumns.filter((column) => column.field !== 'experiment')
            : pipelineRunColumns
        }
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        onClearFilters={onClearFilters}
        toolbarContent={
          <PipelineRunTableToolbar data-testid="manage-runs-table-toolbar" {...filterProps} />
        }
        rowRenderer={rowRenderer}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunColumns, ...tableProps })}
        bottomToolbarContent={
          <ToolbarGroup>
            <ToolbarItem>
              <Tooltip content="Select up to 10 runs to compare.">
                <Button
                  data-testid="manage-runs-update-button"
                  onClick={() =>
                    navigate(compareRunsRoute(namespace, selections, experiment?.experiment_id))
                  }
                  isAriaDisabled={selections.length < 1 || selections.length > 10}
                >
                  Update
                </Button>
              </Tooltip>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                data-testid="manage-runs-cancel-button"
                variant="secondary"
                onClick={() => history.back()}
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

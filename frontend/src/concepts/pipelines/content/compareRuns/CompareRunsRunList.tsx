import * as React from 'react';
import { Button, ExpandableSection } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { PipelinesFilter } from '#~/concepts/pipelines/types';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineFilter, {
  FilterOptions,
  getDataValue,
} from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import useCompareRunsCheckboxTable from '#~/concepts/pipelines/content/compareRuns/useCompareRunsCheckboxTable';
import PipelineRunTableRow from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import { compareRunColumns } from '#~/concepts/pipelines/content/tables/columns';
import PipelineRunTableToolbar from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import { manageCompareRunsRoute } from '#~/routes/pipelines/runs';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';

const CompareRunsRunList: React.FC = () => {
  const { namespace } = usePipelinesAPI();
  const { experiment } = React.useContext(ExperimentContext);
  const navigate = useNavigate();
  const { runs, loaded } = useCompareRuns();
  const [isExpanded, setExpanded] = React.useState(true);
  const [, setFilter] = React.useState<PipelinesFilter | undefined>();
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilter(setFilter);
  const {
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCompareRunsCheckboxTable();

  const filteredRuns = React.useMemo(() => {
    const { filterData: data } = filterToolbarProps;
    const runName = getDataValue(data[FilterOptions.NAME])?.toLowerCase();
    const startedTime = getDataValue(data[FilterOptions.CREATED_AT]);
    const startedDate = startedTime && new Date(startedTime);
    const state = getDataValue(data[FilterOptions.STATUS])?.toLowerCase();
    const experimentFilterId = getDataValue(data[FilterOptions.EXPERIMENT]);
    const pipelineVersionId = getDataValue(data[FilterOptions.PIPELINE_VERSION]);
    return runs.filter((run) => {
      const nameMatch = !runName || run.display_name.toLowerCase().includes(runName);
      const dateTimeMatch = !startedDate || new Date(run.created_at) >= startedDate;
      const stateMatch = !state || run.state.toLowerCase() === state;
      const experimentIdMatch = !experimentFilterId || run.experiment_id === experimentFilterId;
      const pipelineVersionIdMatch =
        !pipelineVersionId ||
        run.pipeline_version_reference?.pipeline_version_id === pipelineVersionId;

      return (
        nameMatch && dateTimeMatch && stateMatch && experimentIdMatch && pipelineVersionIdMatch
      );
    });
  }, [runs, filterToolbarProps]);

  return (
    <ExpandableSection
      toggleText="Run list"
      isExpanded={isExpanded}
      onToggle={(_, expanded) => setExpanded(expanded)}
      isIndented
    >
      <Table
        {...checkboxTableProps}
        defaultSortColumn={1}
        loading={!loaded}
        data={filteredRuns}
        columns={
          experiment
            ? compareRunColumns.filter((column) => column.field !== 'experiment')
            : compareRunColumns
        }
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid="compare-runs-table-toolbar"
            actions={[
              <Button
                key="manage-runs-button"
                variant="primary"
                onClick={() =>
                  navigate(
                    manageCompareRunsRoute(
                      namespace,
                      runs.map((r) => r.run_id),
                      experiment?.experiment_id,
                    ),
                  )
                }
              >
                Manage runs
              </Button>,
            ]}
            {...filterToolbarProps}
          />
        }
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.run_id}
            checkboxProps={{
              isChecked: isSelected(run),
              onToggle: () => toggleSelection(run),
            }}
            hasRowActions={false}
            run={run}
          />
        )}
        variant={TableVariant.compact}
        data-testid="compare-runs-table"
        id="compare-runs-table"
      />
    </ExpandableSection>
  );
};

export default CompareRunsRunList;

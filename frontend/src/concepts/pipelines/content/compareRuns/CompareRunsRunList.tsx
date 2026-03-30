import * as React from 'react';
import { Button, ExpandableSection } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { TableVariant } from '@patternfly/react-table';
import { PipelinesFilter } from '#~/concepts/pipelines/types';
import { Table } from '#~/components/table';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineFilter, {
  FilterOptions,
  getDataValue,
} from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { useCompareRuns } from '#~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import useCompareRunsCheckboxTable from '#~/concepts/pipelines/content/compareRuns/useCompareRunsCheckboxTable';
import PipelineRunTableRow from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import { compareRunColumns } from '#~/concepts/pipelines/content/tables/columns';
import { getMlflowExperimentNameFromRun } from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import PipelineRunTableToolbar from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import { manageCompareRunsRoute } from '#~/routes/pipelines/runs';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import useMlflowExperiments from '#~/concepts/mlflow/useMlflowExperiments';

const CompareRunsRunList: React.FC = () => {
  const { namespace } = usePipelinesAPI();
  const { experiment } = React.useContext(ExperimentContext);
  const { experiments: allExperiments } = React.useContext(PipelineRunExperimentsContext);
  const { status: isMlflowAvailable } = useIsAreaAvailable(SupportedArea.MLFLOW_PIPELINES);
  const { runs, loaded } = useCompareRuns();
  const { data: mlflowExperiments, loaded: mlflowExperimentsLoaded } = useMlflowExperiments({
    workspace: isMlflowAvailable ? namespace : '',
  });
  const [isExpanded, setExpanded] = React.useState(true);
  const [, setFilter] = React.useState<PipelinesFilter | undefined>();
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilter(setFilter);
  const { filterData } = filterToolbarProps;
  const {
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCompareRunsCheckboxTable();

  const filteredRuns = React.useMemo(() => {
    const runName = getDataValue(filterData[FilterOptions.NAME])?.toLowerCase();
    const startedTime = getDataValue(filterData[FilterOptions.CREATED_AT]);
    const startedDate = startedTime && new Date(startedTime);
    const state = getDataValue(filterData[FilterOptions.STATUS])?.toLowerCase();
    const runGroupFilter = experiment
      ? undefined
      : getDataValue(filterData[FilterOptions.RUN_GROUP])?.toLowerCase();
    const pipelineVersionId = getDataValue(filterData[FilterOptions.PIPELINE_VERSION]);
    const mlflowExperimentFilter = isMlflowAvailable
      ? getDataValue(filterData[FilterOptions.MLFLOW_EXPERIMENT])?.toLowerCase()
      : undefined;

    const matchingRunGroups = runGroupFilter
      ? new Set(
          allExperiments
            .filter((e) => e.display_name.toLowerCase().includes(runGroupFilter))
            .map((e) => e.experiment_id),
        )
      : undefined;

    return runs.filter((run) => {
      const nameMatch = !runName || run.display_name.toLowerCase().includes(runName);
      const dateTimeMatch = !startedDate || new Date(run.created_at) >= startedDate;
      const stateMatch = !state || run.state.toLowerCase() === state;
      const runGroupMatch = !matchingRunGroups || matchingRunGroups.has(run.experiment_id);
      const pipelineVersionIdMatch =
        !pipelineVersionId ||
        run.pipeline_version_reference?.pipeline_version_id === pipelineVersionId;
      const mlflowExperimentName = getMlflowExperimentNameFromRun(run);
      const mlflowExperimentMatch =
        !mlflowExperimentFilter ||
        (!!mlflowExperimentName && mlflowExperimentName.toLowerCase() === mlflowExperimentFilter);

      return (
        nameMatch &&
        dateTimeMatch &&
        stateMatch &&
        runGroupMatch &&
        pipelineVersionIdMatch &&
        mlflowExperimentMatch
      );
    });
  }, [runs, filterData, allExperiments, experiment, isMlflowAvailable]);

  const manageRunsHref = manageCompareRunsRoute(
    namespace,
    runs.map((r) => r.run_id),
    experiment?.experiment_id,
  );

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
        columns={compareRunColumns(isMlflowAvailable).filter(
          (column) => !experiment || column.field !== 'run_group',
        )}
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid="compare-runs-table-toolbar"
            actions={[
              <Button
                key="manage-runs-button"
                variant="primary"
                component={(props: React.ComponentProps<'a'>) => (
                  <Link {...props} to={manageRunsHref} />
                )}
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
            mlflow={{
              isAvailable: isMlflowAvailable,
              experiments: mlflowExperiments,
              loaded: mlflowExperimentsLoaded,
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

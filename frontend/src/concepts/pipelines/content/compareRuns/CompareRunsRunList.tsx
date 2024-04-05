import * as React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import { Table } from '~/components/table';
import CompareRunTableRow from '~/concepts/pipelines/content/compareRuns/CompareRunTableRow';
import { compareRunColumns } from '~/concepts/pipelines/content/compareRuns/columns';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import usePipelineFilter, {
  FilterOptions,
  getDataValue,
} from '~/concepts/pipelines/content/tables/usePipelineFilter';
import CompareRunTableToolbar from '~/concepts/pipelines/content/compareRuns/CompareRunTableToolbar';
import { useCompareRuns } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import useCompareRunsCheckboxTable from '~/concepts/pipelines/content/compareRuns/useCompareRunsCheckboxTable';

const CompareRunsRunList: React.FC = () => {
  const { runs, loaded } = useCompareRuns();
  const [isExpanded, setExpanded] = React.useState(true);
  const [, setFilter] = React.useState<PipelinesFilter | undefined>();
  const filterToolbarProps = usePipelineFilter(setFilter);
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
    const experimentId = getDataValue(data[FilterOptions.EXPERIMENT]);
    const pipelineVersionId = getDataValue(data[FilterOptions.PIPELINE_VERSION]);
    return runs.filter((run) => {
      const nameMatch = !runName || run.display_name.toLowerCase().includes(runName);
      const dateTimeMatch = !startedDate || new Date(run.created_at) >= startedDate;
      const stateMatch = !state || run.state.toLowerCase() === state;
      const experimentIdMatch = !experimentId || run.experiment_id === experimentId;
      const pipelineVersionIdMatch =
        !pipelineVersionId ||
        run.pipeline_version_reference.pipeline_version_id === pipelineVersionId;

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
    >
      <Table
        {...checkboxTableProps}
        defaultSortColumn={1}
        loading={!loaded}
        data={filteredRuns}
        columns={compareRunColumns}
        enablePagination="compact"
        emptyTableView={
          <DashboardEmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />
        }
        toolbarContent={
          <CompareRunTableToolbar
            data-testid="compare-runs-table-toolbar"
            {...filterToolbarProps}
          />
        }
        rowRenderer={(run) => (
          <CompareRunTableRow
            key={run.run_id}
            isChecked={isSelected(run)}
            onToggleCheck={() => toggleSelection(run)}
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

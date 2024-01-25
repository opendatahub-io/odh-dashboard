import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { TableVariant } from '@patternfly/react-table';
import { TableBase, getTableColumnSort } from '~/components/table';
import {
  PipelineCoreResourceKF,
  PipelineRunKF,
  PipelineVersionKF,
} from '~/concepts/pipelines/kfTypes';
import { pipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import { useCheckboxTable } from '~/components/table';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineType } from '~/concepts/pipelines/content/tables/utils';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import usePipelineFilter, {
  FilterOptions,
} from '~/concepts/pipelines/content/tables/usePipelineFilter';

type PipelineRunTableProps = {
  runs: PipelineRunKF[];
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
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({
  runs,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const { state } = useLocation();
  const { refreshAllAPI, getJobInformation } = usePipelinesAPI();
  const filterToolbarProps = usePipelineFilter(setFilter);
  const lastLocationPipelineVersion: PipelineVersionKF = state?.lastVersion;
  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCheckboxTable(runs.map(({ id }) => id));
  const [deleteResources, setDeleteResources] = React.useState<PipelineCoreResourceKF[]>([]);

  // Update filter on initial render with the last location-stored pipeline version.
  React.useEffect(() => {
    if (lastLocationPipelineVersion) {
      filterToolbarProps.onFilterUpdate(FilterOptions.PIPELINE_VERSION, {
        label: lastLocationPipelineVersion.name,
        value: lastLocationPipelineVersion.id,
      });
    }

    return () => {
      // Reset the location-stored pipeline version to avoid re-creating
      // a filter that might otherwise have been removed/changed by the user.
      window.history.replaceState({ ...state, lastVersion: undefined }, '');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
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
        emptyTableView={<EmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />}
        toolbarContent={
          <PipelineRunTableToolbar
            {...filterToolbarProps}
            deleteAllEnabled={selections.length > 0}
            onDeleteAll={() =>
              setDeleteResources(
                selections
                  .map<PipelineCoreResourceKF | undefined>((selection) =>
                    runs.find(({ id }) => id === selection),
                  )
                  .filter((v): v is PipelineCoreResourceKF => !!v),
              )
            }
          />
        }
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.id}
            isChecked={isSelected(run.id)}
            onToggleCheck={() => toggleSelection(run.id)}
            onDelete={() => setDeleteResources([run])}
            run={run}
            getJobInformation={getJobInformation}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunColumns, ...tableProps })}
        data-testid="pipeline-run-table"
      />
      <DeletePipelineRunsModal
        toDeleteResources={deleteResources}
        type={PipelineType.TRIGGERED_RUN}
        onClose={(deleted) => {
          if (deleted) {
            refreshAllAPI();
          }
          setDeleteResources([]);
        }}
      />
    </>
  );
};

export default PipelineRunTable;

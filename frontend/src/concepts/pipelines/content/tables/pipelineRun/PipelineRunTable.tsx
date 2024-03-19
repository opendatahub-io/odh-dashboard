import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@patternfly/react-core';
import { TableVariant } from '@patternfly/react-table';

import { TableBase, getTableColumnSort, useCheckboxTable } from '~/components/table';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { pipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import { BulkArchiveRunModal } from '~/pages/pipelines/global/runs/BulkArchiveRunModal';
import { BulkRestoreRunModal } from '~/pages/pipelines/global/runs/BulkRestoreRunModal';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import { RestoreRunModal } from '~/pages/pipelines/global/runs/RestoreRunModal';
import { useSetVersionFilter } from '~/concepts/pipelines/content/tables/useSetVersionFilter';
import { createRunRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type PipelineRunTableProps = {
  runs: PipelineRunKFv2[];
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
  runType: PipelineRunType.Active | PipelineRunType.Archived;
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({
  runs,
  loading,
  totalSize,
  page,
  pageSize,
  runType,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const { namespace, refreshAllAPI } = usePipelinesAPI();
  const filterToolbarProps = usePipelineFilter(setFilter);
  const {
    selections: selectedIds,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
    setSelections: setSelectedIds,
  } = useCheckboxTable(runs.map(({ run_id: runId }) => runId));
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const selectedRuns = selectedIds.reduce((acc: PipelineRunKFv2[], selectedId) => {
    const selectedRun = runs.find((run) => run.run_id === selectedId);

    if (selectedRun) {
      acc.push(selectedRun);
    }

    return acc;
  }, []);

  const primaryToolbarAction = React.useMemo(() => {
    if (runType === PipelineRunType.Archived) {
      return (
        <Button
          variant="primary"
          isDisabled={!selectedIds.length}
          onClick={() => setIsRestoreModalOpen(true)}
        >
          Restore
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        onClick={() =>
          navigate(createRunRoute(namespace, isExperimentsAvailable ? experimentId : undefined))
        }
      >
        Create run
      </Button>
    );
  }, [runType, selectedIds.length, navigate, isExperimentsAvailable, experimentId, namespace]);

  useSetVersionFilter(filterToolbarProps.onFilterUpdate);

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
        columns={
          isExperimentsAvailable && experimentId
            ? pipelineRunColumns.filter((column) => column.field !== 'experiment')
            : pipelineRunColumns
        }
        enablePagination="compact"
        emptyTableView={
          <DashboardEmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />
        }
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid={`${runType}-runs-table-toolbar`}
            {...filterToolbarProps}
            primaryAction={primaryToolbarAction}
            dropdownActions={
              <SimpleMenuActions
                data-testid="run-table-toolbar-actions"
                dropdownItems={[
                  ...(runType === PipelineRunType.Archived
                    ? [
                        {
                          key: 'delete',
                          label: 'Delete',
                          onClick: () => setIsDeleteModalOpen(true),
                          isDisabled: !selectedIds.length,
                        },
                      ]
                    : [
                        {
                          key: 'archive',
                          label: 'Archive',
                          onClick: () => setIsArchiveModalOpen(true),
                          isDisabled: !selectedIds.length,
                        },
                      ]),
                ]}
              />
            }
          />
        }
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.run_id}
            isChecked={isSelected(run.run_id)}
            onToggleCheck={() => toggleSelection(run.run_id)}
            onDelete={() => {
              setSelectedIds([run.run_id]);
              setIsDeleteModalOpen(true);
            }}
            run={run}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunColumns, ...tableProps })}
        data-testid={`${runType}-runs-table`}
        id={`${runType}-runs-table`}
      />

      {isArchiveModalOpen &&
        (selectedRuns.length === 1 ? (
          <ArchiveRunModal
            run={selectedRuns[0]}
            onCancel={() => {
              setIsArchiveModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ) : (
          <BulkArchiveRunModal
            runs={selectedRuns}
            onCancel={() => {
              setIsArchiveModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ))}

      {isRestoreModalOpen &&
        (selectedRuns.length === 1 ? (
          <RestoreRunModal
            run={selectedRuns[0]}
            onCancel={() => {
              setIsRestoreModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ) : (
          <BulkRestoreRunModal
            runs={selectedRuns}
            onCancel={() => {
              setIsRestoreModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ))}

      {isDeleteModalOpen && (
        <DeletePipelineRunsModal
          toDeleteResources={selectedRuns}
          type={PipelineRunType.Archived}
          onClose={(deleted) => {
            if (deleted) {
              refreshAllAPI();
            }
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default PipelineRunTable;

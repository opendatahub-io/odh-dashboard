import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { TableVariant, Td } from '@patternfly/react-table';
import { ColumnsIcon } from '@patternfly/react-icons';

import { TableBase, getTableColumnSort, useCheckboxTable } from '~/components/table';
import { ArtifactType, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  getExperimentRunColumns,
  pipelineRunColumns,
} from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import { RestoreRunModal } from '~/pages/pipelines/global/runs/RestoreRunModal';
import { useSetVersionFilter } from '~/concepts/pipelines/content/tables/useSetVersionFilter';
import { createRunRoute, experimentsCompareRunsRoute } from '~/routes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useContextExperimentArchived } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { getArtifactProperties } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { useGetArtifactsByRuns } from '~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsByRuns';
import { ArtifactProperty } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';
import { CustomMetricsColumnsModal } from './CustomMetricsColumnsModal';
import { RunWithMetrics } from './types';
import { UnavailableMetricValue } from './UnavailableMetricValue';
import { useMetricColumnNames } from './useMetricColumnNames';

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
  runType: PipelineRunType.ACTIVE | PipelineRunType.ARCHIVED;
};

interface PipelineRunTableInternalProps extends Omit<PipelineRunTableProps, 'runs'> {
  runs: RunWithMetrics[];
  artifactsLoaded: boolean;
  artifactsError: Error | undefined;
  metricsNames: Set<string>;
}

const PipelineRunTableInternal: React.FC<PipelineRunTableInternalProps> = ({
  runs,
  loading,
  totalSize,
  page,
  pageSize,
  runType,
  metricsNames,
  artifactsLoaded,
  artifactsError,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const navigate = useNavigate();
  const { experimentId, pipelineVersionId, pipelineId } = useParams();
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
  const [isCustomColModalOpen, setIsCustomColModalOpen] = React.useState(false);
  const selectedRuns = selectedIds.reduce((acc: PipelineRunKFv2[], selectedId) => {
    const selectedRun = runs.find((run) => run.run_id === selectedId);

    if (selectedRun) {
      acc.push(selectedRun);
    }

    return acc;
  }, []);
  const restoreButtonTooltipRef = React.useRef(null);
  const isExperimentArchived = useContextExperimentArchived();
  const isExperimentsEnabled = isExperimentsAvailable && experimentId;
  const metricsColumnNames = useMetricColumnNames(experimentId ?? '', metricsNames);

  const primaryToolbarAction = React.useMemo(() => {
    if (runType === PipelineRunType.ARCHIVED) {
      return (
        <>
          {isExperimentArchived && (
            <Tooltip
              content="Archived runs cannot be restored until its associated experiment is restored."
              triggerRef={restoreButtonTooltipRef}
            />
          )}
          <Button
            data-testid="restore-button"
            variant="primary"
            isDisabled={!selectedIds.length}
            isAriaDisabled={isExperimentArchived}
            onClick={() => setIsRestoreModalOpen(true)}
            ref={restoreButtonTooltipRef}
          >
            Restore
          </Button>
        </>
      );
    }

    return (
      <Button
        key="create-run"
        data-testid="create-run-button"
        variant="primary"
        onClick={() =>
          navigate(
            createRunRoute(
              namespace,
              isExperimentsAvailable ? experimentId : undefined,
              pipelineId,
              pipelineVersionId,
            ),
          )
        }
      >
        Create run
      </Button>
    );
  }, [
    runType,
    isExperimentArchived,
    selectedIds.length,
    navigate,
    namespace,
    isExperimentsAvailable,
    experimentId,
    pipelineId,
    pipelineVersionId,
  ]);

  const compareRunsAction =
    isExperimentsEnabled && !isExperimentArchived ? (
      <Tooltip content="Select up to 10 runs to compare.">
        <Button
          key="compare-runs"
          data-testid="compare-runs-button"
          variant="secondary"
          isAriaDisabled={selectedIds.length === 0 || selectedIds.length > 10}
          onClick={() =>
            navigate(experimentsCompareRunsRoute(namespace, experimentId, selectedIds))
          }
        >
          Compare runs
        </Button>
      </Tooltip>
    ) : null;

  const toolbarDropdownAction = (
    <SimpleMenuActions
      key="run-table-toolbar-actions"
      testId="run-table-toolbar-actions"
      dropdownItems={[
        ...(runType === PipelineRunType.ARCHIVED
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
  );

  useSetVersionFilter(filterToolbarProps.onFilterUpdate);

  const getColumns = () => {
    let columns = isExperimentsEnabled
      ? getExperimentRunColumns(metricsColumnNames)
      : pipelineRunColumns;
    if (isExperimentsEnabled) {
      columns = columns.filter((column) => column.field !== 'experiment');
    }
    if (pipelineVersionId) {
      columns = columns.filter((column) => column.field !== 'pipeline_version');
    }

    return columns;
  };

  return (
    <>
      <TableBase
        {...checkboxTableProps}
        {...(isExperimentsEnabled && { hasStickyColumns: true })}
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
        columns={getColumns()}
        enablePagination="compact"
        emptyTableView={
          <DashboardEmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />
        }
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid={`${runType}-runs-table-toolbar`}
            {...filterToolbarProps}
            actions={[
              primaryToolbarAction,
              ...(compareRunsAction ? [compareRunsAction] : []),
              toolbarDropdownAction,
              isExperimentsEnabled
                ? [
                    <Tooltip
                      key="custom-metrics-columns"
                      content={
                        !artifactsLoaded
                          ? 'Customize metrics columns: Loading metrics...'
                          : !(metricsColumnNames.length || metricsNames.size)
                          ? 'Customize metrics columns: No metrics available'
                          : 'Customize metrics columns'
                      }
                    >
                      <Button
                        variant="plain"
                        aria-label="Customize metrics column button"
                        isAriaDisabled={
                          !artifactsLoaded || !(metricsColumnNames.length || metricsNames.size)
                        }
                        onClick={() => setIsCustomColModalOpen(true)}
                        icon={<ColumnsIcon />}
                      />
                    </Tooltip>,
                  ]
                : [],
            ]}
          />
        }
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.run_id}
            checkboxProps={{
              isChecked: isSelected(run.run_id),
              onToggle: () => toggleSelection(run.run_id),
              isStickyColumn: !!isExperimentsEnabled,
              stickyMinWidth: '45px',
            }}
            onDelete={() => {
              setSelectedIds([run.run_id]);
              setIsDeleteModalOpen(true);
            }}
            run={run}
            hasExperiments={!isExperimentsEnabled}
            customCells={metricsColumnNames.map((metricName: string) => (
              <Td key={metricName} dataLabel={metricName}>
                {!artifactsLoaded && !artifactsError ? (
                  <Skeleton />
                ) : (
                  run.metrics.find((metric) => metric.name === metricName)?.value ?? (
                    <UnavailableMetricValue />
                  )
                )}
              </Td>
            ))}
            runType={runType}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({
          columns: getColumns(),
          ...tableProps,
        })}
        data-testid={`${runType}-runs-table`}
        id={`${runType}-runs-table`}
      />
      <ArchiveRunModal
        isOpen={isArchiveModalOpen}
        runs={selectedRuns}
        onCancel={() => {
          setIsArchiveModalOpen(false);
          setSelectedIds([]);
        }}
      />
      <RestoreRunModal
        isOpen={isRestoreModalOpen}
        runs={selectedRuns}
        onCancel={() => {
          setIsRestoreModalOpen(false);
          setSelectedIds([]);
        }}
      />
      {isDeleteModalOpen && (
        <DeletePipelineRunsModal
          toDeleteResources={selectedRuns}
          type={PipelineRunType.ARCHIVED}
          onClose={(deleted) => {
            if (deleted) {
              refreshAllAPI();
            }
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
          }}
        />
      )}
      {isCustomColModalOpen && (
        <CustomMetricsColumnsModal
          key={metricsNames.size}
          experimentId={experimentId}
          columns={[...new Set([...metricsColumnNames, ...metricsNames])].map((metricName) => ({
            id: metricName,
            content: metricName,
            props: { checked: metricsColumnNames.includes(metricName) },
          }))}
          onClose={() => setIsCustomColModalOpen(false)}
        />
      )}
    </>
  );
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({ runs, page, ...props }) => {
  const [runArtifacts, runArtifactsLoaded, runArtifactsError] = useGetArtifactsByRuns(runs);
  const metricsNames = new Set<string>();

  const runsWithMetrics = runs.map((run) => ({
    ...run,
    metrics: runArtifacts.reduce((acc: ArtifactProperty[], runArtifactsMap) => {
      const artifacts = Object.entries(runArtifactsMap).find(
        ([runId]) => run.run_id === runId,
      )?.[1];

      artifacts?.forEach((artifact) => {
        if (artifact.getType() === ArtifactType.METRICS) {
          const artifactProperties = getArtifactProperties(artifact);

          artifactProperties.map((artifactProp) => metricsNames.add(artifactProp.name));
          acc.push(...artifactProperties);
        }
      });

      return acc;
    }, []),
  }));

  return (
    <PipelineRunTableInternal
      runs={runsWithMetrics}
      page={page}
      metricsNames={metricsNames}
      artifactsLoaded={runArtifactsLoaded}
      artifactsError={runArtifactsError}
      {...props}
    />
  );
};

export default PipelineRunTable;

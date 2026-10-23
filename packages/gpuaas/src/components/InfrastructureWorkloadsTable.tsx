import * as React from 'react';
import {
  Card,
  CardBody,
  Alert,
  AlertActionCloseButton,
  Button,
  ExpandableSection,
  Title,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { DashboardEmptyTableView, Table, TrackingOutcome } from '@odh-dashboard/ui-core';
import TrainingJobStatusModal from '@odh-dashboard/model-training/components/TrainingJobStatusModal';
import RayJobStatusModal from '@odh-dashboard/model-training/components/RayJobStatusModal';
import DeploymentStatusModal from '@odh-dashboard/model-serving/components/DeploymentStatusModal';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { NotebookState } from '@odh-dashboard/internal/pages/projects/notebook/types';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import StartNotebookModal from '@odh-dashboard/internal/concepts/notebooks/StartNotebookModal';
import { useNotebookStatus } from '@odh-dashboard/internal/utilities/notebookControllerUtils';
import { startNotebook, stopNotebook } from '@odh-dashboard/internal/api';
import { fireWorkbenchStatusModalAction } from '@odh-dashboard/internal/concepts/kueue/workbenchTracking';
import { isRayJob, isTrainJob } from '@odh-dashboard/model-training/types';
import InfrastructureWorkloadsToolbar from './InfrastructureWorkloadsToolbar';
import { HardwareProfileCell, StatusCell } from './InfrastructureWorkloadComponents';
import {
  InfrastructureWorkloadKind,
  type InfrastructureWorkloadRow,
  type InfrastructureWorkloadsFilterType,
  type InfrastructureWorkloadsFilterValues,
} from '../types/infrastructureWorkloads';
import {
  getInfrastructureWorkloadsTableColumns,
  INFRASTRUCTURE_WORKLOADS_PARTIAL_FAILURE_TITLE,
} from '../const';
import {
  filterInfrastructureWorkloads,
  formatInfrastructureWorkloadKueueValue,
  getInfrastructureWorkloadFilterValues,
} from '../utils/infrastructureWorkloads';
import { getHardwareProfileRefFromAnnotations } from '../utils/hardwareModels';

type FilterValues = InfrastructureWorkloadsFilterValues;
type LocalFilterValues = Omit<FilterValues, 'status'>;

const getNextFilterValues = (
  current: LocalFilterValues,
  type: Exclude<InfrastructureWorkloadsFilterType, 'status'>,
  value: string,
): LocalFilterValues => {
  const nextValue = current[type].includes(value)
    ? current[type].filter((selectedValue) => selectedValue !== value)
    : [...current[type], value];

  return { ...current, [type]: nextValue };
};

type InfrastructureWorkloadsTableProps = {
  workloads: InfrastructureWorkloadRow[];
  kueueEnabled: boolean;
  hardwareProfilesLoading: boolean;
  notebookStates: NotebookState[];
  failedSources: string[];
  overviewStatusFilters: string[];
  onOverviewStatusFiltersChange: React.Dispatch<React.SetStateAction<string[]>>;
};

type InfrastructureWorkloadTableRowProps = {
  workload: InfrastructureWorkloadRow;
  notebookStates: NotebookState[];
  kueueEnabled: boolean;
  hardwareProfilesLoading: boolean;
  onStatusClick: () => void;
};

const InfrastructureWorkloadTableRow: React.FC<InfrastructureWorkloadTableRowProps> = ({
  workload,
  notebookStates,
  kueueEnabled,
  hardwareProfilesLoading,
  onStatusClick,
}) => {
  const notebookState =
    workload.resource.kind === InfrastructureWorkloadKind.Notebook
      ? notebookStates.find(
          (state) => state.notebook.metadata.name === workload.resource.metadata.name,
        )
      : undefined;

  return (
    <Tr data-testid={`infrastructure-workload-row-${workload.name}`}>
      <Td dataLabel="Name">{workload.name}</Td>
      <Td dataLabel="Type">{workload.type}</Td>
      <Td dataLabel="Status">
        <StatusCell workload={workload} notebookState={notebookState} onClick={onStatusClick} />
      </Td>
      {kueueEnabled && (
        <Td
          dataLabel="Queue position"
          data-testid={`infrastructure-workload-queue-position-${workload.name}`}
        >
          {formatInfrastructureWorkloadKueueValue(workload.queuePosition, workload.kueueState)}
        </Td>
      )}
      {kueueEnabled && (
        <Td
          dataLabel="Priority class"
          data-testid={`infrastructure-workload-priority-class-${workload.name}`}
        >
          {formatInfrastructureWorkloadKueueValue(workload.priority, workload.kueueState)}
        </Td>
      )}
      <Td dataLabel="Hardware profile">
        <HardwareProfileCell
          {...workload}
          loading={
            hardwareProfilesLoading &&
            Boolean(getHardwareProfileRefFromAnnotations(workload.resource.metadata.annotations))
          }
        />
      </Td>
    </Tr>
  );
};

const WorkbenchStatusModalAdapter: React.FC<{
  notebookState: NotebookState;
  kueueStatus?: InfrastructureWorkloadRow['kueueStatus'];
  onClose: () => void;
}> = ({ notebookState, kueueStatus: workloadKueueStatus, onClose }) => {
  const { kueueStatusByNotebookName } = React.useContext(ProjectDetailsContext);
  const { notebook, isStarting, isRunning, isStopping, runningPodUid, containerStatuses } =
    notebookState;
  const kueueStatus = workloadKueueStatus
    ? { status: workloadKueueStatus }
    : kueueStatusByNotebookName[notebook.metadata.name] ?? null;
  const [notebookStatus, events] = useNotebookStatus(
    isStarting,
    notebook,
    isRunning,
    runningPodUid,
  );
  const isError = notebookStatus?.currentStatus === 'Error';
  const isStopped = !isError && !isRunning && !isStarting && !isStopping;

  return (
    <StartNotebookModal
      notebook={notebook}
      isStarting={isStarting}
      isRunning={isRunning}
      isStopping={isStopping}
      notebookStatus={notebookStatus}
      events={events}
      kueueStatus={kueueStatus}
      containerStatuses={containerStatuses}
      trackStatusModalActions
      onClose={onClose}
      buttons={({ activeTab }) => (
        <Button
          variant="primary"
          onClick={() => {
            fireWorkbenchStatusModalAction(
              isStopped ? 'Start workbench' : 'Stop workbench',
              TrackingOutcome.submit,
              activeTab,
              { kueueStatus, isStarting, isRunning, isStopping },
            );
            const action = isStopped
              ? startNotebook(notebook)
              : stopNotebook(notebook.metadata.name, notebook.metadata.namespace);
            void action.then(() => notebookState.refresh()).catch(() => undefined);
          }}
        >
          {isStopped ? 'Start workbench' : 'Stop workbench'}
        </Button>
      )}
    />
  );
};

const InfrastructureWorkloadsTable: React.FC<InfrastructureWorkloadsTableProps> = ({
  workloads,
  kueueEnabled,
  hardwareProfilesLoading,
  notebookStates,
  failedSources,
  overviewStatusFilters,
  onOverviewStatusFiltersChange,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState('');
  const [filterType, setFilterType] = React.useState<InfrastructureWorkloadsFilterType>('status');
  const [filterValues, setFilterValues] = React.useState<LocalFilterValues>({
    type: [],
    hardwareProfile: [],
  });
  const [selectedWorkload, setSelectedWorkload] = React.useState<InfrastructureWorkloadRow>();
  const [isPartialFailureDismissed, setIsPartialFailureDismissed] = React.useState(false);
  const workloadsWithWorkbenchStatus = workloads;

  const failedSourcesKey = failedSources.join(',');
  React.useEffect(() => {
    setIsPartialFailureDismissed(false);
  }, [failedSourcesKey]);

  const closeStatusModal = React.useCallback(() => setSelectedWorkload(undefined), []);

  const renderStatusModal = () => {
    if (!selectedWorkload) {
      return null;
    }
    const { resource } = selectedWorkload;
    if (isTrainJob(resource)) {
      return (
        <TrainingJobStatusModal
          job={resource}
          jobStatus={selectedWorkload.jobStatus}
          onClose={closeStatusModal}
        />
      );
    }
    if (isRayJob(resource)) {
      return (
        <RayJobStatusModal
          job={resource}
          jobStatus={selectedWorkload.jobStatus}
          onClose={closeStatusModal}
        />
      );
    }
    if (resource.kind === InfrastructureWorkloadKind.Notebook) {
      const notebookState = notebookStates.find(
        (state) => state.notebook.metadata.name === resource.metadata.name,
      );
      return notebookState ? (
        <WorkbenchStatusModalAdapter
          notebookState={notebookState}
          kueueStatus={selectedWorkload.kueueStatus}
          onClose={closeStatusModal}
        />
      ) : null;
    }
    if (
      resource.kind === InfrastructureWorkloadKind.InferenceService ||
      resource.kind === InfrastructureWorkloadKind.LLMInferenceService
    ) {
      const model = resource;
      const status = selectedWorkload.deploymentStatus;
      if (!status) {
        return null;
      }
      const deployment: Deployment = {
        modelServingPlatformId: 'gpuaas',
        model,
        status,
      };
      return <DeploymentStatusModal deployment={deployment} onClose={closeStatusModal} />;
    }
    return null;
  };

  const filteredWorkloads = React.useMemo(() => {
    const selectedFilterValues: FilterValues = {
      status: overviewStatusFilters,
      ...filterValues,
    };

    return filterInfrastructureWorkloads(
      workloadsWithWorkbenchStatus,
      searchValue,
      filterType,
      selectedFilterValues[filterType],
    );
  }, [filterType, filterValues, overviewStatusFilters, searchValue, workloadsWithWorkbenchStatus]);

  const availableFilterValues = React.useMemo<FilterValues>(
    () => ({
      status: getInfrastructureWorkloadFilterValues(workloadsWithWorkbenchStatus, 'status'),
      type: getInfrastructureWorkloadFilterValues(workloadsWithWorkbenchStatus, 'type'),
      hardwareProfile: getInfrastructureWorkloadFilterValues(
        workloadsWithWorkbenchStatus,
        'hardwareProfile',
      ),
    }),
    [workloadsWithWorkbenchStatus],
  );

  const toggleFilterValue = React.useCallback(
    (type: InfrastructureWorkloadsFilterType, value: string) => {
      if (type === 'status') {
        onOverviewStatusFiltersChange((current) =>
          current.includes(value)
            ? current.filter((selectedValue) => selectedValue !== value)
            : [...current, value],
        );
        return;
      }

      setFilterValues((current) => getNextFilterValues(current, type, value));
    },
    [onOverviewStatusFiltersChange],
  );

  const clearFilters = React.useCallback(() => {
    setSearchValue('');
    setFilterValues({ type: [], hardwareProfile: [] });
    onOverviewStatusFiltersChange([]);
  }, [onOverviewStatusFiltersChange]);

  const selectedFilterValues: FilterValues = React.useMemo(
    () => ({ status: overviewStatusFilters, ...filterValues }),
    [filterValues, overviewStatusFilters],
  );

  const columns = React.useMemo(
    () => getInfrastructureWorkloadsTableColumns(kueueEnabled),
    [kueueEnabled],
  );

  return (
    <Card data-testid="infrastructure-workloads-card">
      <CardBody>
        <ExpandableSection
          className="gpuaas-workloads-table"
          isExpanded={isExpanded}
          onToggle={(_event, nextExpanded) => setIsExpanded(nextExpanded)}
          toggleContent={
            <Title headingLevel="h4" size="md" className="gpuaas-workloads-table__toggle-content">
              Workloads
            </Title>
          }
          toggleWrapper="h4"
        >
          <div className="pf-v6-u-pt-md">
            {failedSources.length > 0 && !isPartialFailureDismissed && (
              <Alert
                isInline
                variant="warning"
                className="pf-v6-u-mb-md"
                title={INFRASTRUCTURE_WORKLOADS_PARTIAL_FAILURE_TITLE}
                data-testid="infrastructure-workloads-partial-error"
                actionClose={
                  <AlertActionCloseButton
                    data-testid="infrastructure-workloads-partial-error-close"
                    onClose={() => setIsPartialFailureDismissed(true)}
                  />
                }
              >
                {failedSources.join(', ')} could not be loaded. Refresh to try again.
              </Alert>
            )}
            <InfrastructureWorkloadsToolbar
              searchValue={searchValue}
              filterType={filterType}
              availableFilterValues={availableFilterValues}
              selectedFilterValues={selectedFilterValues}
              onSearchChange={setSearchValue}
              onFilterTypeChange={setFilterType}
              onFilterValueChange={toggleFilterValue}
              onClearFilters={clearFilters}
            />
            {filteredWorkloads.length === 0 ? (
              <DashboardEmptyTableView
                titleText="No results"
                clearFiltersText="Reset filters"
                onClearFilters={clearFilters}
              />
            ) : (
              <Table
                data-testid="infrastructure-workloads-table"
                aria-label="Infrastructure workloads table"
                data={filteredWorkloads}
                columns={columns}
                enablePagination="compact"
                rowRenderer={(workload) => (
                  <InfrastructureWorkloadTableRow
                    key={`${workload.namespace}/${workload.type}/${workload.name}`}
                    workload={workload}
                    notebookStates={notebookStates}
                    kueueEnabled={kueueEnabled}
                    hardwareProfilesLoading={hardwareProfilesLoading}
                    onStatusClick={() => setSelectedWorkload(workload)}
                  />
                )}
              />
            )}
          </div>
        </ExpandableSection>
      </CardBody>
      {renderStatusModal()}
    </Card>
  );
};

export default InfrastructureWorkloadsTable;

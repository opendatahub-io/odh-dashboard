import * as React from 'react';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Button,
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
import { getInfrastructureWorkloadsTableColumns } from '../const';
import {
  filterInfrastructureWorkloads,
  formatInfrastructureWorkloadKueueValue,
  getInfrastructureWorkloadFilterValues,
  getInfrastructureWorkbenchStatus,
} from '../utils/infrastructureWorkloads';

type FilterValues = InfrastructureWorkloadsFilterValues;

type InfrastructureWorkloadsTableProps = {
  workloads: InfrastructureWorkloadRow[];
  kueueEnabled: boolean;
  notebookStates: NotebookState[];
};

type InfrastructureWorkloadTableRowProps = {
  workload: InfrastructureWorkloadRow;
  notebookStates: NotebookState[];
  kueueEnabled: boolean;
  onStatusClick: () => void;
};

const InfrastructureWorkloadTableRow: React.FC<InfrastructureWorkloadTableRowProps> = ({
  workload,
  notebookStates,
  kueueEnabled,
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
        <Td dataLabel="Queue position">
          {formatInfrastructureWorkloadKueueValue(workload.queuePosition, workload.kueueState)}
        </Td>
      )}
      {kueueEnabled && (
        <Td dataLabel="Priority class">
          {formatInfrastructureWorkloadKueueValue(workload.priority, workload.kueueState)}
        </Td>
      )}
      <Td dataLabel="Hardware profile">
        <HardwareProfileCell {...workload} />
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
            void action.then(() => notebookState.refresh());
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
  notebookStates,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [searchValue, setSearchValue] = React.useState('');
  const [filterType, setFilterType] = React.useState<InfrastructureWorkloadsFilterType>('status');
  const [filterValues, setFilterValues] = React.useState<FilterValues>({
    status: [],
    type: [],
    hardwareProfile: [],
  });
  const [selectedWorkload, setSelectedWorkload] = React.useState<InfrastructureWorkloadRow>();
  const workloadsWithWorkbenchStatus = React.useMemo(
    () =>
      workloads.map((workload) => {
        if (workload.resource.kind !== InfrastructureWorkloadKind.Notebook) {
          return workload;
        }
        const notebookState = notebookStates.find(
          (state) => state.notebook.metadata.name === workload.resource.metadata.name,
        );
        return notebookState
          ? { ...workload, status: getInfrastructureWorkbenchStatus(notebookState) }
          : workload;
      }),
    [notebookStates, workloads],
  );

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
    return filterInfrastructureWorkloads(
      workloadsWithWorkbenchStatus,
      searchValue,
      filterType,
      filterValues[filterType],
    );
  }, [filterType, filterValues, searchValue, workloadsWithWorkbenchStatus]);

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
      setFilterValues((current) => ({
        ...current,
        [type]: current[type].includes(value)
          ? current[type].filter((selectedValue) => selectedValue !== value)
          : [...current[type], value],
      }));
    },
    [],
  );

  const clearFilters = React.useCallback(() => {
    setSearchValue('');
    setFilterValues({ status: [], type: [], hardwareProfile: [] });
  }, []);

  const columns = React.useMemo(
    () => getInfrastructureWorkloadsTableColumns(kueueEnabled),
    [kueueEnabled],
  );

  return (
    <Card isExpanded={isExpanded} data-testid="infrastructure-workloads-card">
      <CardHeader
        onExpand={() => setIsExpanded((expanded) => !expanded)}
        toggleButtonProps={{
          id: 'infrastructure-workloads-toggle',
          'aria-label': 'Expand workloads',
        }}
      >
        <CardTitle>
          <Title headingLevel="h4" size="md">
            Workloads
          </Title>
        </CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <CardBody>
          {isExpanded && (
            <>
              <InfrastructureWorkloadsToolbar
                searchValue={searchValue}
                filterType={filterType}
                availableFilterValues={availableFilterValues}
                selectedFilterValues={filterValues}
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
                      onStatusClick={() => setSelectedWorkload(workload)}
                    />
                  )}
                />
              )}
            </>
          )}
        </CardBody>
      </CardExpandableContent>
      {renderStatusModal()}
    </Card>
  );
};

export default InfrastructureWorkloadsTable;

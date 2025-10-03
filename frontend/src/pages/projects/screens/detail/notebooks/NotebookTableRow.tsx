import * as React from 'react';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Icon, Popover, Split, SplitItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { NotebookState } from '#~/pages/projects/notebook/types';
import NotebookRouteLink from '#~/pages/projects/notebook/NotebookRouteLink';
import { NotebookKind } from '#~/k8sTypes';
import NotebookImagePackageDetails from '#~/pages/projects/notebook/NotebookImagePackageDetails';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { TableRowTitleDescription } from '#~/components/table';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { getDescriptionFromK8sResource } from '#~/concepts/k8s/utils';
import { NotebookSize } from '#~/types';
import NotebookStateStatus from '#~/pages/projects/notebook/NotebookStateStatus';
import { NotebookActionsColumn } from '#~/pages/projects/notebook/NotebookActionsColumn';
import { computeNotebooksTolerations } from '#~/utilities/tolerations';
import { startNotebook, stopNotebook } from '#~/api';
import { currentlyHasPipelines } from '#~/concepts/pipelines/elyra/utils';
import { fireNotebookTrackingEvent } from '#~/pages/projects/notebook/utils';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useAppContext } from '#~/app/AppContext';
import StopNotebookConfirmModal from '#~/pages/projects/notebook/StopNotebookConfirmModal';
import { useNotebookKindPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';
import StateActionToggle from '#~/components/StateActionToggle';
import { NotebookImageStatus } from './const';
import { NotebookImageDisplayName } from './NotebookImageDisplayName';
import NotebookStorageBars from './NotebookStorageBars';
import NotebookSizeDetails from './NotebookSizeDetails';
import useNotebookImage from './useNotebookImage';
import useNotebookDeploymentSize from './useNotebookDeploymentSize';
import { extractAcceleratorResources } from './utils';
import NotebookUpdateImageModal from './NotebookUpdateImageModal';

type NotebookTableRowProps = {
  obj: NotebookState;
  rowIndex: number;
  onNotebookDelete: (notebook: NotebookKind) => void;
  canEnablePipelines: boolean;
  showOutOfDateElyraInfo: boolean;
};

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  obj,
  rowIndex,
  onNotebookDelete,
  canEnablePipelines,
  showOutOfDateElyraInfo,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const [isExpanded, setExpanded] = React.useState(false);
  const { size: notebookSize } = useNotebookDeploymentSize(obj.notebook);
  const acceleratorResources = extractAcceleratorResources(
    obj.notebook.spec.template.spec.containers[0].resources,
  );

  const lastDeployedSize: NotebookSize = {
    name: 'Custom',
    resources: obj.notebook.spec.template.spec.containers[0].resources ?? {
      limits: {},
      requests: {},
    },
  };
  const [notebookImage, loaded, loadError] = useNotebookImage(obj.notebook);

  const podSpecOptionsState = useNotebookKindPodSpecOptionsState(obj.notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = obj.notebook.metadata;
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const onStart = React.useCallback(() => {
    setInProgress(true);
    const tolerationSettings = computeNotebooksTolerations(dashboardConfig, obj.notebook);
    startNotebook(
      obj.notebook,
      tolerationSettings,
      canEnablePipelines && !currentlyHasPipelines(obj.notebook),
    ).then(() => {
      fireNotebookTrackingEvent('started', obj.notebook, podSpecOptionsState);
      obj.refresh().then(() => setInProgress(false));
    });
  }, [dashboardConfig, obj, canEnablePipelines, podSpecOptionsState]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', obj.notebook, podSpecOptionsState);
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      obj.refresh().then(() => setInProgress(false));
    });
  }, [podSpecOptionsState, notebookName, notebookNamespace, obj]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      handleStop();
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, handleStop]);

  const onModalClose = () => {
    setIsModalOpen(false);
  };

  const onUpdateImageClick = () => {
    if (
      notebookImage &&
      notebookImage.imageStatus !== NotebookImageStatus.DELETED &&
      notebookImage.latestImageVersion
    ) {
      setIsModalOpen(true);
    } else {
      navigate(`/projects/${currentProject.metadata.name}/spawner/${obj.notebook.metadata.name}`);
    }
  };

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr isStriped={rowIndex % 2 === 0}>
        <Td
          data-testid="notebook-table-expand-cell"
          expand={{
            rowIndex,
            expandId: 'notebook-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={
              <NotebookRouteLink
                isLarge
                notebook={obj.notebook}
                isRunning={obj.isRunning}
                aria-label="open"
                buttonStyle={{ textDecoration: 'none' }}
              />
            }
            description={getDescriptionFromK8sResource(obj.notebook)}
            resource={obj.notebook}
          />
        </Td>
        <Td dataLabel="Workbench image">
          <Split>
            <SplitItem>
              <NotebookImageDisplayName
                notebook={obj.notebook}
                notebookImage={notebookImage}
                notebookState={obj}
                loaded={loaded}
                loadError={loadError}
                isExpanded
                onUpdateImageClick={onUpdateImageClick}
                isUpdating={isUpdating}
                setIsUpdating={setIsUpdating}
              />
            </SplitItem>
            {showOutOfDateElyraInfo && (
              <SplitItem>
                <Popover
                  alertSeverityVariant="info"
                  headerIcon={<InfoCircleIcon />}
                  headerContent="Update image to the latest version"
                  bodyContent="The selected image version does not support the latest pipeline version. To use Elyra for pipelines, update the image to the latest version by editing the workbench."
                  footerContent={
                    <Button
                      onClick={() => {
                        navigate(
                          `/projects/${currentProject.metadata.name}/spawner/${obj.notebook.metadata.name}`,
                        );
                      }}
                    >
                      Edit workbench
                    </Button>
                  }
                >
                  <DashboardPopupIconButton
                    aria-label="Notebook image has out of date Elyra version"
                    data-testid="outdated-elyra-info"
                    icon={
                      <Icon status="info">
                        <InfoCircleIcon />
                      </Icon>
                    }
                  />
                </Popover>
              </SplitItem>
            )}
          </Split>
        </Td>
        <Td dataLabel="Container size">
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              {isHardwareProfileAvailable ? (
                <HardwareProfileTableColumn
                  namespace={obj.notebook.metadata.namespace}
                  resource={obj.notebook}
                  containerResources={podSpecOptionsState.podSpecOptions.resources}
                  isActive={obj.isRunning || obj.isStarting}
                />
              ) : (
                notebookSize?.name ?? <i>{lastDeployedSize.name}</i>
              )}
            </FlexItem>
          </Flex>
        </Td>
        <Td dataLabel="Status">
          <NotebookStateStatus notebookState={obj} stopNotebook={onStop} startNotebook={onStart} />
        </Td>
        <Td>
          <StateActionToggle
            currentState={obj}
            onStart={onStart}
            onStop={onStop}
            isDisabled={inProgress}
          />
        </Td>
        <Td isActionCell>
          <NotebookActionsColumn
            project={currentProject}
            notebookState={obj}
            onNotebookDelete={onNotebookDelete}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Workbench storages">
          <ExpandableRowContent>
            <NotebookStorageBars notebook={obj.notebook} />
          </ExpandableRowContent>
        </Td>
        <Td dataLabel="Packages">
          <ExpandableRowContent>
            {notebookImage && notebookImage.imageStatus !== NotebookImageStatus.DELETED ? (
              <NotebookImagePackageDetails dependencies={notebookImage.dependencies} />
            ) : (
              'Unknown package info'
            )}
          </ExpandableRowContent>
        </Td>
        <Td dataLabel="Limits">
          <ExpandableRowContent>
            <NotebookSizeDetails
              notebookSize={notebookSize || lastDeployedSize}
              acceleratorResources={acceleratorResources}
            />
          </ExpandableRowContent>
        </Td>
        <Td />
        <Td />
        <Td />
      </Tr>
      {isOpenConfirm && (
        <StopNotebookConfirmModal
          notebookState={obj}
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              handleStop();
            }
            setOpenConfirm(false);
          }}
        />
      )}
      {isModalOpen && notebookImage && (
        <NotebookUpdateImageModal
          notebookState={obj}
          notebookImage={notebookImage}
          notebook={obj.notebook}
          onModalClose={onModalClose}
          setIsUpdating={setIsUpdating}
        />
      )}
    </Tbody>
  );
};

export default NotebookTableRow;

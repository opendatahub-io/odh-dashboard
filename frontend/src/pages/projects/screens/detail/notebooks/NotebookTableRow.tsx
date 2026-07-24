import * as React from 'react';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Button,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Split,
  SplitItem,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { InfoCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  DashboardPopupIconButton,
  ResourceNameTooltip,
  StateActionToggle,
} from '@odh-dashboard/ui-core';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { getDescriptionFromK8sResource } from '@odh-dashboard/k8s-core';
import { NotebookState } from '#~/pages/projects/notebook/types';
import NotebookRouteLink from '#~/pages/projects/notebook/NotebookRouteLink';
import { NotebookKind } from '#~/k8sTypes';
import NotebookImagePackageDetails from '#~/pages/projects/notebook/NotebookImagePackageDetails';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { TableRowTitleDescription } from '#~/components/table';
import NotebookStateStatus from '#~/pages/projects/notebook/NotebookStateStatus';
import { NotebookActionsColumn } from '#~/pages/projects/notebook/NotebookActionsColumn';
import { startNotebook, stopNotebook, getMlflowInstancePatch } from '#~/api';
import { currentlyHasPipelines } from '#~/concepts/pipelines/elyra/utils';
import { fireNotebookTrackingEvent } from '#~/pages/projects/notebook/utils';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import StopNotebookConfirmModal from '#~/pages/projects/notebook/StopNotebookConfirmModal';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';
import { isWorkbenchMigrated, useNotebookHardwareProfile } from '#~/concepts/notebooks/utils';
import { UseAssignHardwareProfileResult } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { getDeletedHardwareProfilePatches } from '#~/concepts/hardwareProfiles/utils';
import { WORKBENCH_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { useWorkbenchFeatureStores } from '#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import { KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';
import { NotebookImageStatus } from './const';
import { NotebookImageDisplayName } from './NotebookImageDisplayName';
import NotebookStorageBars from './NotebookStorageBars';
import NotebookFeatureStoreList from './NotebookFeatureStoreList';
import NotebookSizeDetails from './NotebookSizeDetails';
import WorkbenchMigrationLabel from './WorkbenchMigrationLabel';
import useNotebookImage from './useNotebookImage';
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
  const { currentProject, kueueStatusByNotebookName } = React.useContext(ProjectDetailsContext);
  const editWorkbenchHref = `/projects/${currentProject.metadata.name}/spawner/${obj.notebook.metadata.name}`;
  const [isExpanded, setExpanded] = React.useState(false);
  const [notebookImage, loaded, loadError] = useNotebookImage(obj.notebook);

  const hardwareProfileOptions: UseAssignHardwareProfileResult<NotebookKind> =
    useNotebookHardwareProfile(obj.notebook);
  const { podSpecOptionsState } = hardwareProfileOptions;

  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = obj.notebook.metadata;
  const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
    useHardwareProfileBindingState(obj.notebook, WORKBENCH_VISIBILITY);
  const showMigrationRequired = !isWorkbenchMigrated(obj.notebook);

  const isMlflowAvailable = useIsAreaAvailable(SupportedArea.MLFLOW).status;
  const isFeatureStoreAvailable = useIsAreaAvailable(SupportedArea.FEATURE_STORE).status;
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(currentProject);
  const hasQueueLabel = !!obj.notebook.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const showKueueAnomalyIndicator =
    isKueueFeatureEnabled && isProjectKueueEnabled && !hasQueueLabel;
  const { featureStores, loaded: featureStoresLoaded } = useWorkbenchFeatureStores();
  const availableStoreMap = React.useMemo(
    () => new Map(featureStores.map((fs) => [fs.projectName, fs.namespace])),
    [featureStores],
  );

  const onStart = React.useCallback(() => {
    setInProgress(true);
    const extraPatches = [
      ...getDeletedHardwareProfilePatches(bindingStateInfo, obj.notebook),
      ...getMlflowInstancePatch(obj.notebook, isMlflowAvailable),
    ];
    startNotebook(
      obj.notebook,
      canEnablePipelines && !currentlyHasPipelines(obj.notebook),
      extraPatches,
    )
      .then(() => {
        fireNotebookTrackingEvent('started', obj.notebook, podSpecOptionsState, {
          kueueStatus: kueueStatusByNotebookName[notebookName] ?? null,
          isStarting: true,
          isRunning: false,
          isStopping: false,
        });
        obj.refresh().then(() => setInProgress(false));
      })
      .catch(() => {
        setInProgress(false);
      });
  }, [
    obj,
    canEnablePipelines,
    podSpecOptionsState,
    bindingStateInfo,
    isMlflowAvailable,
    kueueStatusByNotebookName,
    notebookName,
  ]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', obj.notebook, podSpecOptionsState, {
      kueueStatus: kueueStatusByNotebookName[notebookName] ?? null,
      isStarting: false,
      isRunning: obj.isRunning,
      isStopping: true,
    });
    setInProgress(true);
    stopNotebook(
      notebookName,
      notebookNamespace,
      getDeletedHardwareProfilePatches(bindingStateInfo, obj.notebook),
    ).then(() => {
      obj.refresh().then(() => setInProgress(false));
    });
  }, [
    podSpecOptionsState,
    notebookName,
    notebookNamespace,
    obj,
    bindingStateInfo,
    kueueStatusByNotebookName,
  ]);

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
              <Flex
                flexWrap={{ default: 'nowrap' }}
                spaceItems={{ default: 'spaceItemsXs' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <ResourceNameTooltip resource={obj.notebook} wrap={false}>
                    <NotebookRouteLink
                      isLarge
                      notebook={obj.notebook}
                      isRunning={obj.isRunning}
                      aria-label="open"
                      buttonStyle={{ textDecoration: 'none' }}
                    />
                  </ResourceNameTooltip>
                </FlexItem>
                {showMigrationRequired && (
                  <FlexItem>
                    <WorkbenchMigrationLabel />
                  </FlexItem>
                )}
                {showKueueAnomalyIndicator && (
                  <FlexItem>
                    <Tooltip content="This workbench is not managed by Kueue. It was created without a queue assignment and will bypass queue-based resource management in this Kueue-enabled project.">
                      <Icon
                        role="button"
                        status="warning"
                        data-testid="kueue-anomaly-indicator"
                        aria-label="Workbench bypasses Kueue queue management"
                        tabIndex={0}
                      >
                        <ExclamationTriangleIcon />
                      </Icon>
                    </Tooltip>
                  </FlexItem>
                )}
              </Flex>
            }
            description={getDescriptionFromK8sResource(obj.notebook)}
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
                updateImageHref={editWorkbenchHref}
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
                      component={(props: React.ComponentProps<'a'>) => (
                        <Link {...props} to={editWorkbenchHref} />
                      )}
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
              <HardwareProfileTableColumn
                namespace={obj.notebook.metadata.namespace}
                resource={obj.notebook}
                isActive={obj.isRunning || obj.isStarting}
                bindingState={{
                  bindingStateInfo,
                  bindingStateLoaded,
                  loadError: bindingStateLoadError,
                }}
                onExpandRow={() => setExpanded(true)}
              />
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
              notebookContainerSize={podSpecOptionsState.podSpecOptions.resources}
            />
          </ExpandableRowContent>
        </Td>
        {isFeatureStoreAvailable ? (
          <Td>
            <ExpandableRowContent>
              <NotebookFeatureStoreList
                key={obj.notebook.metadata.uid}
                notebook={obj.notebook}
                availableStoreMap={availableStoreMap}
                availabilityLoaded={featureStoresLoaded}
              />
            </ExpandableRowContent>
          </Td>
        ) : (
          <Td />
        )}
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

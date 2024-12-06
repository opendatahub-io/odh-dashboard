import * as React from 'react';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Icon, Popover, Split, SplitItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { NotebookState } from '~/pages/projects/notebook/types';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import { NotebookKind } from '~/k8sTypes';
import NotebookImagePackageDetails from '~/pages/projects/notebook/NotebookImagePackageDetails';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { TableRowTitleDescription } from '~/components/table';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { NotebookSize } from '~/types';
import NotebookStateStatus from '~/pages/projects/notebook/NotebookStateStatus';
import { NotebookActionsColumn } from '~/pages/projects/notebook/NotebookActionsColumn';
import { computeNotebooksTolerations } from '~/utilities/tolerations';
import { startNotebook, stopNotebook } from '~/api';
import { currentlyHasPipelines } from '~/concepts/pipelines/elyra/utils';
import { fireNotebookTrackingEvent } from '~/pages/projects/notebook/utils';
import useStopNotebookModalAvailability from '~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useAppContext } from '~/app/AppContext';
import NotebookStateAction from '~/pages/projects/notebook/NotebookStateAction';
import StopNotebookConfirmModal from '~/pages/projects/notebook/StopNotebookConfirmModal';
import { NotebookImageAvailability } from './const';
import { NotebookImageDisplayName } from './NotebookImageDisplayName';
import NotebookStorageBars from './NotebookStorageBars';
import NotebookSizeDetails from './NotebookSizeDetails';
import useNotebookImage from './useNotebookImage';
import useNotebookDeploymentSize from './useNotebookDeploymentSize';
import useNotebookAcceleratorProfileFormState from './useNotebookAcceleratorProfileFormState';

type NotebookTableRowProps = {
  obj: NotebookState;
  rowIndex: number;
  onNotebookDelete: (notebook: NotebookKind) => void;
  canEnablePipelines: boolean;
  compact?: boolean;
  showOutOfDateElyraInfo: boolean;
};

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  obj,
  rowIndex,
  onNotebookDelete,
  canEnablePipelines,
  compact,
  showOutOfDateElyraInfo,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const [isExpanded, setExpanded] = React.useState(false);
  const { size: notebookSize } = useNotebookDeploymentSize(obj.notebook);
  const lastDeployedSize: NotebookSize = {
    name: 'Custom',
    resources: obj.notebook.spec.template.spec.containers[0].resources ?? {
      limits: {},
      requests: {},
    },
  };
  const [notebookImage, loaded, loadError] = useNotebookImage(obj.notebook);
  const { initialState: acceleratorProfile } = useNotebookAcceleratorProfileFormState(obj.notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = obj.notebook.metadata;

  const onStart = React.useCallback(() => {
    setInProgress(true);
    const tolerationSettings = computeNotebooksTolerations(dashboardConfig, obj.notebook);
    startNotebook(
      obj.notebook,
      tolerationSettings,
      canEnablePipelines && !currentlyHasPipelines(obj.notebook),
    ).then(() => {
      fireNotebookTrackingEvent('started', obj.notebook, notebookSize, acceleratorProfile);
      obj.refresh().then(() => setInProgress(false));
    });
  }, [dashboardConfig, obj, canEnablePipelines, notebookSize, acceleratorProfile]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', obj.notebook, notebookSize, acceleratorProfile);
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      obj.refresh().then(() => setInProgress(false));
    });
  }, [acceleratorProfile, notebookName, notebookNamespace, notebookSize, obj]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      handleStop();
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, handleStop]);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr isStriped={rowIndex % 2 === 0}>
        {!compact ? (
          <Td
            data-testid="notebook-table-expand-cell"
            expand={{
              rowIndex,
              expandId: 'notebook-row-item',
              isExpanded,
              onToggle: () => setExpanded(!isExpanded),
            }}
          />
        ) : null}
        <Td dataLabel="Name">
          {compact ? (
            <div
              style={{
                display: 'flex',
                gap: 'var(--pf-t--global--spacer--xs)',
                alignItems: 'baseline',
                flexWrap: 'wrap',
              }}
            >
              <img
                style={{ width: 20, position: 'relative', top: 4 }}
                src={typedObjectImage(ProjectObjectType.notebook)}
                alt="workbenches"
              />
              <div style={{ whiteSpace: 'nowrap' }}>
                {getDisplayNameFromK8sResource(obj.notebook)}
              </div>
            </div>
          ) : (
            <TableRowTitleDescription
              title={getDisplayNameFromK8sResource(obj.notebook)}
              description={getDescriptionFromK8sResource(obj.notebook)}
              resource={obj.notebook}
            />
          )}
        </Td>
        <Td dataLabel="Notebook image">
          <Split>
            <SplitItem>
              <NotebookImageDisplayName
                notebookImage={notebookImage}
                loaded={loaded}
                loadError={loadError}
                isExpanded
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
        {!compact ? (
          <Td dataLabel="Container size">
            <Flex
              spaceItems={{ default: 'spaceItemsXs' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>{notebookSize?.name ?? <i>{lastDeployedSize.name}</i>}</FlexItem>
            </Flex>
          </Td>
        ) : null}
        <Td dataLabel="Status">
          <NotebookStateStatus notebookState={obj} stopNotebook={onStop} />
        </Td>
        <Td>
          <NotebookStateAction
            notebookState={obj}
            onStart={onStart}
            onStop={onStop}
            isDisabled={inProgress}
          />
        </Td>
        <Td isActionCell={compact} style={{ verticalAlign: 'top' }}>
          <NotebookRouteLink label="Open" notebook={obj.notebook} isRunning={obj.isRunning} />
        </Td>
        {!compact ? (
          <Td isActionCell>
            <NotebookActionsColumn
              project={currentProject}
              notebookState={obj}
              onNotebookDelete={onNotebookDelete}
            />
          </Td>
        ) : null}
      </Tr>
      {!compact ? (
        <Tr isExpanded={isExpanded}>
          <Td />
          <Td dataLabel="Workbench storages">
            <ExpandableRowContent>
              <NotebookStorageBars notebook={obj.notebook} />
            </ExpandableRowContent>
          </Td>
          <Td dataLabel="Packages">
            <ExpandableRowContent>
              {notebookImage &&
              notebookImage.imageAvailability !== NotebookImageAvailability.DELETED ? (
                <NotebookImagePackageDetails dependencies={notebookImage.dependencies} />
              ) : (
                'Unknown package info'
              )}
            </ExpandableRowContent>
          </Td>
          <Td dataLabel="Limits">
            <ExpandableRowContent>
              <NotebookSizeDetails notebookSize={notebookSize || lastDeployedSize} />
            </ExpandableRowContent>
          </Td>
          <Td />
          <Td />
          <Td />
        </Tr>
      ) : null}
      {isOpenConfirm ? (
        <StopNotebookConfirmModal
          notebookState={obj}
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              handleStop();
            }
            setOpenConfirm(false);
          }}
        />
      ) : null}
    </Tbody>
  );
};

export default NotebookTableRow;

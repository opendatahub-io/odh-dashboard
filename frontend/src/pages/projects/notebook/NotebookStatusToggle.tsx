import * as React from 'react';
import { Flex, FlexItem, Switch } from '@patternfly/react-core';
import { startNotebook, stopNotebook } from '~/api';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import useNotebookAccelerators from '~/pages/projects/screens/detail/notebooks/useNotebookAccelerator';
import useNotebookDeploymentSize from '~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import { computeNotebooksTolerations } from '~/utilities/tolerations';
import { useAppContext } from '~/app/AppContext';
import { currentlyHasPipelines } from '~/concepts/pipelines/elyra/utils';
import { NotebookState } from './types';
import useRefreshNotebookUntilStartOrStop from './useRefreshNotebookUntilStartOrStop';
import StopNotebookConfirmModal from './StopNotebookConfirmModal';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';
import NotebookStatusText from './NotebookStatusText';

type NotebookStatusToggleProps = {
  notebookState: NotebookState;
  doListen: boolean;
  enablePipelines?: boolean;
};

const NotebookStatusToggle: React.FC<NotebookStatusToggleProps> = ({
  notebookState,
  doListen,
  enablePipelines,
}) => {
  const { notebook, isStarting, isRunning, isStopping, refresh } = notebookState;
  const [acceleratorData] = useNotebookAccelerators(notebook);
  const { size } = useNotebookDeploymentSize(notebook);
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const listenToNotebookStart = useRefreshNotebookUntilStartOrStop(notebookState, doListen);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const notebookName = notebook.metadata.name;
  const notebookNamespace = notebook.metadata.namespace;
  const isRunningOrStarting = isStarting || isRunning;

  /** If in progress, it is faking the opposite */
  const isChecked = inProgress ? !isRunningOrStarting : isRunningOrStarting;

  let label = '';
  if (isStarting) {
    label = 'Starting...';
  } else if (isStopping) {
    label = 'Stopping...';
  } else {
    label = isRunning ? 'Running' : 'Stopped';
  }

  const fireNotebookTrackingEvent = React.useCallback(
    (action: 'started' | 'stopped') => {
      fireTrackingEvent(`Workbench ${action}`, {
        acceleratorCount: acceleratorData.useExisting ? undefined : acceleratorData.count,
        accelerator: acceleratorData.accelerator
          ? `${acceleratorData.accelerator.spec.displayName} (${acceleratorData.accelerator.metadata.name}): ${acceleratorData.accelerator.spec.identifier}`
          : acceleratorData.useExisting
          ? 'Unknown'
          : 'None',
        lastSelectedSize:
          size?.name ||
          notebook.metadata.annotations?.['notebooks.opendatahub.io/last-size-selection'],
        lastSelectedImage:
          notebook.metadata.annotations?.['notebooks.opendatahub.io/last-image-selection'],
        projectName: notebook.metadata.namespace,
        notebookName: notebook.metadata.name,
        ...(action === 'stopped' && {
          lastActivity: notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'],
        }),
      });
    },
    [acceleratorData, notebook, size],
  );

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped');
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
      listenToNotebookStart(true, true);
    });
  }, [notebookName, notebookNamespace, refresh, listenToNotebookStart, fireNotebookTrackingEvent]);

  return (
    <>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Switch
            aria-label={label}
            isDisabled={inProgress || isStopping}
            id={`${notebookName}-${notebookNamespace}`}
            isChecked={isChecked}
            onClick={() => {
              if (isRunningOrStarting) {
                if (dontShowModalValue) {
                  handleStop();
                } else {
                  setOpenConfirm(true);
                }
              } else {
                setInProgress(true);
                const tolerationSettings = computeNotebooksTolerations(
                  dashboardConfig,
                  notebookState.notebook,
                );
                startNotebook(
                  notebook,
                  tolerationSettings,
                  enablePipelines && !currentlyHasPipelines(notebook),
                ).then(() => {
                  fireNotebookTrackingEvent('started');
                  refresh().then(() => setInProgress(false));
                  listenToNotebookStart(true);
                });
              }
            }}
          />
        </FlexItem>
        <FlexItem>
          <NotebookStatusText
            notebookState={notebookState}
            stopNotebook={handleStop}
            labelText={label}
          />
        </FlexItem>
      </Flex>
      <StopNotebookConfirmModal
        isOpen={isOpenConfirm}
        notebookState={notebookState}
        onClose={(confirmStatus) => {
          if (confirmStatus) {
            handleStop();
          }
          setOpenConfirm(false);
        }}
      />
    </>
  );
};

export default NotebookStatusToggle;

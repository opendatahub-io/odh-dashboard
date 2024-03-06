import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { startNotebook, stopNotebook } from '~/api';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import useNotebookAcceleratorProfile from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfile';
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
  isDisabled?: boolean;
};

const NotebookStatusToggle: React.FC<NotebookStatusToggleProps> = ({
  notebookState,
  doListen,
  enablePipelines,
  isDisabled,
}) => {
  const { notebook, isStarting, isRunning, isStopping, refresh } = notebookState;
  const [acceleratorProfile] = useNotebookAcceleratorProfile(notebook);
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
        acceleratorCount: acceleratorProfile.useExisting ? undefined : acceleratorProfile.count,
        accelerator: acceleratorProfile.acceleratorProfile
          ? `${acceleratorProfile.acceleratorProfile.spec.displayName} (${acceleratorProfile.acceleratorProfile.metadata.name}): ${acceleratorProfile.acceleratorProfile.spec.identifier}`
          : acceleratorProfile.useExisting
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
    [acceleratorProfile, notebook, size],
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
      <div
        style={{ display: 'flex', gap: 'var(--pf-v5-global--spacer--sm)', alignItems: 'center' }}
      >
        <Switch
          aria-label={label}
          isDisabled={inProgress || isStopping || isDisabled}
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
        <NotebookStatusText
          notebookState={notebookState}
          stopNotebook={handleStop}
          labelText={label}
        />
      </div>
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

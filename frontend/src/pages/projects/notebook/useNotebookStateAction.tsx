import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import useNotebookImage from '~/pages/projects/screens/detail/notebooks/useNotebookImage';
import StopNotebookConfirmModal from '~/pages/projects/notebook/StopNotebookConfirmModal';
import useStopNotebookModalAvailability from '~/pages/projects/notebook/useStopNotebookModalAvailability';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import useNotebookAcceleratorProfile from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfile';
import useNotebookDeploymentSize from '~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import { computeNotebooksTolerations } from '~/utilities/tolerations';
import { startNotebook, stopNotebook } from '~/api';
import { currentlyHasPipelines } from '~/concepts/pipelines/elyra/utils';
import { useAppContext } from '~/app/AppContext';
import { NotebookState } from './types';

const useNotebookStateAction = (
  notebookState: NotebookState,
  canEnablePipelines: boolean,
): {
  NotebookStateAction: React.ReactElement;
  startNotebook: () => void;
  stopNotebook: () => void;
} => {
  const { notebook, refresh, isStarting, isRunning, isStopping } = notebookState;
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [notebookImage] = useNotebookImage(notebook);
  const acceleratorProfile = useNotebookAcceleratorProfile(notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const { size } = useNotebookDeploymentSize(notebook);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = notebook.metadata;

  const actionDisabled =
    inProgress ||
    isStopping ||
    (notebookImage?.imageAvailability === NotebookImageAvailability.DELETED && !isRunning);

  const fireNotebookTrackingEvent = React.useCallback(
    (action: 'started' | 'stopped') => {
      fireFormTrackingEvent(`Workbench ${action === 'started' ? 'Started' : 'Stopped'}`, {
        outcome: TrackingOutcome.submit,
        acceleratorCount: acceleratorProfile.unknownProfileDetected
          ? undefined
          : acceleratorProfile.count,
        accelerator: acceleratorProfile.acceleratorProfile
          ? `${acceleratorProfile.acceleratorProfile.spec.displayName} (${acceleratorProfile.acceleratorProfile.metadata.name}): ${acceleratorProfile.acceleratorProfile.spec.identifier}`
          : acceleratorProfile.unknownProfileDetected
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

  const handleStart = React.useCallback(() => {
    setInProgress(true);
    const tolerationSettings = computeNotebooksTolerations(dashboardConfig, notebook);
    startNotebook(
      notebook,
      tolerationSettings,
      canEnablePipelines && !currentlyHasPipelines(notebook),
    ).then(() => {
      fireNotebookTrackingEvent('started');
      refresh().then(() => setInProgress(false));
    });
  }, [dashboardConfig, canEnablePipelines, fireNotebookTrackingEvent, notebook, refresh]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped');
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
    });
  }, [fireNotebookTrackingEvent, notebookName, notebookNamespace, refresh]);

  const NotebookStateAction =
    isStarting || isRunning ? (
      <Button
        data-testid="notebook-stop-action"
        variant="link"
        isInline
        isDisabled={actionDisabled}
        onClick={() => {
          if (dontShowModalValue) {
            handleStop();
          } else {
            setOpenConfirm(true);
          }
        }}
      >
        {isOpenConfirm ? (
          <StopNotebookConfirmModal
            notebookState={notebookState}
            onClose={(confirmStatus) => {
              if (confirmStatus) {
                handleStop();
              }
              setOpenConfirm(false);
            }}
          />
        ) : null}
        Stop
      </Button>
    ) : (
      <Button
        data-testid="notebook-start-action"
        variant="link"
        isInline
        isDisabled={actionDisabled}
        onClick={handleStart}
      >
        Start
      </Button>
    );
  return { NotebookStateAction, startNotebook: handleStart, stopNotebook: handleStop };
};

export default useNotebookStateAction;

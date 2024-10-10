import * as React from 'react';
import { ActionsColumn } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import { NotebookState } from '~/pages/projects/notebook/types';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import { startNotebook, stopNotebook } from '~/api';
import useNotebookAcceleratorProfile from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfile';
import useNotebookDeploymentSize from '~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import useStopNotebookModalAvailability from '~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useAppContext } from '~/app/AppContext';
import { computeNotebooksTolerations } from '~/utilities/tolerations';
import { currentlyHasPipelines } from '~/concepts/pipelines/elyra/utils';
import StopNotebookConfirmModal from '~/pages/projects/notebook/StopNotebookConfirmModal';
import useNotebookImage from '~/pages/projects/screens/detail/notebooks/useNotebookImage';
import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';

export const useNotebookActionsColumn = (
  project: ProjectKind,
  notebookState: NotebookState,
  enablePipelines: boolean,
  onNotebookDelete: (notebook: NotebookKind) => void,
): [React.ReactNode, () => void] => {
  const navigate = useNavigate();
  const { notebook, isStarting, isRunning, isStopping, refresh } = notebookState;
  const acceleratorProfile = useNotebookAcceleratorProfile(notebook);
  const { size } = useNotebookDeploymentSize(notebook);
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const [notebookImage] = useNotebookImage(notebookState.notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const notebookName = notebook.metadata.name;
  const notebookNamespace = notebook.metadata.namespace;
  const isDisabled =
    isStopping ||
    inProgress ||
    (notebookImage?.imageAvailability === NotebookImageAvailability.DELETED && !isRunning);
  const isRunningOrStarting = isStarting || isRunning;

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

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped');
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
    });
  }, [fireNotebookTrackingEvent, notebookName, notebookNamespace, refresh]);

  return [
    <>
      <ActionsColumn
        items={[
          {
            isDisabled: isDisabled || isRunningOrStarting,
            title: 'Start',
            onClick: () => {
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
              });
            },
          },
          {
            isDisabled: isDisabled || !isRunningOrStarting,
            title: 'Stop',
            onClick: () => {
              if (dontShowModalValue) {
                handleStop();
              } else {
                setOpenConfirm(true);
              }
            },
          },
          {
            isDisabled: isStarting || isStopping,
            title: 'Edit workbench',
            onClick: () => {
              navigate(
                `/projects/${project.metadata.name}/spawner/${notebookState.notebook.metadata.name}`,
              );
            },
          },
          {
            title: 'Delete workbench',
            onClick: () => {
              onNotebookDelete(notebookState.notebook);
            },
          },
        ]}
      />
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
    </>,
    handleStop,
  ];
};

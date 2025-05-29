import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { NotebookKind, ProjectKind } from '#~/k8sTypes';
import NotebookRouteLink from '#~/pages/projects/notebook/NotebookRouteLink';
import NotebookStateStatus from '#~/pages/projects/notebook/NotebookStateStatus';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { NotebookActionsColumn } from '#~/pages/projects/notebook/NotebookActionsColumn';
import { computeNotebooksTolerations } from '#~/utilities/tolerations';
import { startNotebook, stopNotebook } from '#~/api';
import { currentlyHasPipelines } from '#~/concepts/pipelines/elyra/utils';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useAppContext } from '#~/app/AppContext';
import { fireNotebookTrackingEvent } from '#~/pages/projects/notebook/utils';
import StopNotebookConfirmModal from '#~/pages/projects/notebook/StopNotebookConfirmModal';
import NotebookStateAction from '#~/pages/projects/notebook/NotebookStateAction';
import { useNotebookKindPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';

type ProjectTableRowNotebookTableRowProps = {
  project: ProjectKind;
  obj: NotebookState;
  onNotebookDelete: (notebook: NotebookKind) => void;
  enablePipelines: boolean;
};
const ProjectTableRowNotebookTableRow: React.FC<ProjectTableRowNotebookTableRowProps> = ({
  project,
  obj: notebookState,
  onNotebookDelete,
  enablePipelines,
}) => {
  const { notebook, refresh } = notebookState;
  const podSpecOptionsState = useNotebookKindPodSpecOptionsState(notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = notebook.metadata;

  const onStart = React.useCallback(() => {
    setInProgress(true);
    const tolerationSettings = computeNotebooksTolerations(dashboardConfig, notebook);
    startNotebook(
      notebook,
      tolerationSettings,
      enablePipelines && !currentlyHasPipelines(notebook),
    ).then(() => {
      fireNotebookTrackingEvent('started', notebook, podSpecOptionsState);
      refresh().then(() => setInProgress(false));
    });
  }, [podSpecOptionsState, dashboardConfig, enablePipelines, notebook, refresh]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', notebook, podSpecOptionsState);
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
    });
  }, [podSpecOptionsState, notebook, notebookName, notebookNamespace, refresh]);

  const onStop = React.useCallback(() => {
    if (dontShowModalValue) {
      handleStop();
    } else {
      setOpenConfirm(true);
    }
  }, [dontShowModalValue, handleStop]);

  return (
    <Tr
      style={{ border: 'none', verticalAlign: 'middle' }}
      data-testid="project-notebooks-table-row"
    >
      <Td dataLabel="Name">
        <NotebookRouteLink notebook={notebookState.notebook} isRunning={notebookState.isRunning} />
      </Td>
      <Td dataLabel="Status">
        <NotebookStateStatus
          notebookState={notebookState}
          stopNotebook={onStop}
          startNotebook={onStart}
          isVertical={false}
        />
      </Td>
      <Td>
        <NotebookStateAction
          notebookState={notebookState}
          onStart={onStart}
          onStop={onStop}
          isDisabled={inProgress}
        />
      </Td>
      <Td isActionCell>
        <NotebookActionsColumn
          project={project}
          notebookState={notebookState}
          onNotebookDelete={onNotebookDelete}
        />
      </Td>
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
    </Tr>
  );
};

export default ProjectTableRowNotebookTableRow;

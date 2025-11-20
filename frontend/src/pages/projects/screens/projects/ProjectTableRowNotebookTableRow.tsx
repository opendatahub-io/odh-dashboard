import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { NotebookKind, ProjectKind } from '#~/k8sTypes';
import NotebookRouteLink from '#~/pages/projects/notebook/NotebookRouteLink';
import NotebookStateStatus from '#~/pages/projects/notebook/NotebookStateStatus';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { NotebookActionsColumn } from '#~/pages/projects/notebook/NotebookActionsColumn';
import { startNotebook, stopNotebook } from '#~/api';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import { fireNotebookTrackingEvent } from '#~/pages/projects/notebook/utils';
import StopNotebookConfirmModal from '#~/pages/projects/notebook/StopNotebookConfirmModal';
import StateActionToggle from '#~/components/StateActionToggle';
import { currentlyHasPipelines } from '#~/concepts/pipelines/elyra/utils';
import { useNotebookHardwareProfile } from '#~/concepts/notebooks/utils';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { getDeletedHardwareProfilePatches } from '#~/concepts/hardwareProfiles/utils';
import { WORKBENCH_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';

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
  const { projectHardwareProfiles } = React.useContext(ProjectDetailsContext);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const { name: notebookName, namespace: notebookNamespace } = notebook.metadata;
  const { podSpecOptionsState } = useNotebookHardwareProfile(notebook);
  const [hardwareProfileBindingState] = useHardwareProfileBindingState(
    notebook,
    WORKBENCH_VISIBILITY,
    projectHardwareProfiles,
  );

  const onStart = React.useCallback(() => {
    setInProgress(true);
    startNotebook(
      notebook,
      enablePipelines && !currentlyHasPipelines(notebook),
      getDeletedHardwareProfilePatches(hardwareProfileBindingState, notebook),
    ).then(() => {
      fireNotebookTrackingEvent('started', notebook, podSpecOptionsState);
      refresh().then(() => setInProgress(false));
    });
  }, [podSpecOptionsState, enablePipelines, notebook, refresh, hardwareProfileBindingState]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', notebook, podSpecOptionsState);
    setInProgress(true);
    stopNotebook(
      notebookName,
      notebookNamespace,
      getDeletedHardwareProfilePatches(hardwareProfileBindingState, notebook),
    ).then(() => {
      refresh().then(() => setInProgress(false));
    });
  }, [
    podSpecOptionsState,
    notebook,
    notebookName,
    notebookNamespace,
    refresh,
    hardwareProfileBindingState,
  ]);

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
        <StateActionToggle
          currentState={notebookState}
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
      {isOpenConfirm && (
        <StopNotebookConfirmModal
          notebookState={notebookState}
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              handleStop();
            }
            setOpenConfirm(false);
          }}
        />
      )}
    </Tr>
  );
};

export default ProjectTableRowNotebookTableRow;

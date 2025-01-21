import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import NotebookStateStatus from '~/pages/projects/notebook/NotebookStateStatus';
import { NotebookState } from '~/pages/projects/notebook/types';
import { NotebookActionsColumn } from '~/pages/projects/notebook/NotebookActionsColumn';
import { computeNotebooksTolerations } from '~/utilities/tolerations';
import { startNotebook, stopNotebook } from '~/api';
import { currentlyHasPipelines } from '~/concepts/pipelines/elyra/utils';
import useStopNotebookModalAvailability from '~/pages/projects/notebook/useStopNotebookModalAvailability';
import { useAppContext } from '~/app/AppContext';
import useNotebookDeploymentSize from '~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import { fireNotebookTrackingEvent } from '~/pages/projects/notebook/utils';
import StopNotebookConfirmModal from '~/pages/projects/notebook/StopNotebookConfirmModal';
import NotebookStateAction from '~/pages/projects/notebook/NotebookStateAction';
import useNotebookAcceleratorProfileFormState from '~/pages/projects/screens/detail/notebooks/useNotebookAcceleratorProfileFormState';

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
  const { initialState: acceleratorProfile } = useNotebookAcceleratorProfileFormState(notebook);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const { dashboardConfig } = useAppContext();
  const { size } = useNotebookDeploymentSize(notebook);
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
      fireNotebookTrackingEvent('started', notebook, size, acceleratorProfile);
      refresh().then(() => setInProgress(false));
    });
  }, [acceleratorProfile, dashboardConfig, enablePipelines, notebook, refresh, size]);

  const handleStop = React.useCallback(() => {
    fireNotebookTrackingEvent('stopped', notebook, size, acceleratorProfile);
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
    });
  }, [acceleratorProfile, notebook, notebookName, notebookNamespace, refresh, size]);

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

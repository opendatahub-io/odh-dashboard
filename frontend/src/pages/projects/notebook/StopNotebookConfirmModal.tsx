import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import ConfirmStopModal from '#~/pages/projects/components/ConfirmStopModal.tsx';
import NotebookRouteLink from './NotebookRouteLink';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';
import { NotebookState } from './types';

type StopNotebookConfirmProps = {
  notebookState: NotebookState;
  onClose: (confirmStatus: boolean) => void;
};

const StopNotebookConfirmModal: React.FC<StopNotebookConfirmProps> = ({
  notebookState,
  onClose,
}) => {
  const { notebook, isRunning } = notebookState;
  const [dontShowModalValue, setDontShowModalValue] = useStopNotebookModalAvailability();
  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      // Disable the choice -- we were in this modal and they checked and then cancelled -- so undo it
      setDontShowModalValue(false);
    }

    onClose(confirmStatus);
  };

  const modalActions = [
    <Button
      data-testid="stop-workbench-button"
      key="confirm-stop"
      variant="primary"
      onClick={() => onBeforeClose(true)}
    >
      Stop workbench
    </Button>,
    <Button key="cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
      Cancel
    </Button>,
  ];

  return (
    <ConfirmStopModal
      message={
        <>
          Any unsaved changes to the <strong>{getDisplayNameFromK8sResource(notebook)}</strong> will
          be lost.
        </>
      }
      isRunning={isRunning}
      modalActions={modalActions}
      link={<NotebookRouteLink label="open the workbench" notebook={notebook} isRunning />}
      onBeforeClose={onBeforeClose}
      dataTestId="stop-notebook-modal"
      title="Stop workbench?"
      saveChanges
      dontShowModalValue={dontShowModalValue}
      setDontShowModalValue={setDontShowModalValue}
    />
  );
};

export default StopNotebookConfirmModal;

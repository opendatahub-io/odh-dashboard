import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import NotebookRouteLink from './NotebookRouteLink';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';
import { NotebookState } from './types';
import StopWorkbenchModal from './StopWorkbenchModal';

type StopNotebookConfirmProps = {
  notebookState: NotebookState;
  onClose: (confirmStatus: boolean) => void;
};

const StopNotebookConfirmModal: React.FC<StopNotebookConfirmProps> = ({
  notebookState,
  onClose,
}) => {
  const { notebook, isRunning } = notebookState;
  const [, setDontShowModalValue] = useStopNotebookModalAvailability();
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
    <StopWorkbenchModal
      workbenchName={<strong>{getDisplayNameFromK8sResource(notebook)}</strong>}
      isRunning={isRunning}
      modalActions={modalActions}
      link={<NotebookRouteLink label="open the workbench" notebook={notebook} isRunning />}
      onBeforeClose={onBeforeClose}
    />
  );
};

export default StopNotebookConfirmModal;

import * as React from 'react';
import { Button, Checkbox, Modal, Stack, StackItem } from '@patternfly/react-core';
import NotebookRouteLink from './NotebookRouteLink';
import { NotebookKind } from '../../../k8sTypes';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';

type StopNotebookConfirmProps = {
  isOpen: boolean;
  notebook?: NotebookKind;
  onClose: (confirmStatus: boolean) => void;
};

const StopNotebookConfirmModal: React.FC<StopNotebookConfirmProps> = ({
  isOpen,
  notebook,
  onClose,
}) => {
  const [dontShowModalValue, setDontShowModalValue] = useStopNotebookModalAvailability();
  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      // Disable the choice -- we were in this modal and they checked and then cancelled -- so undo it
      setDontShowModalValue(false);
    }

    onClose(confirmStatus);
  };

  return (
    <Modal
      variant="small"
      title="Stop workbench?"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button key="confirm-stop" variant="primary" onClick={() => onBeforeClose(true)}>
          Stop workbench
        </Button>,
        <Button key="cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to stop the workbench? Any changes without saving will be erased.
        </StackItem>
        {notebook && (
          <StackItem>
            To save changes, access your{' '}
            <NotebookRouteLink label="workbench" notebook={notebook} isRunning />.
          </StackItem>
        )}
        <StackItem>
          <Checkbox
            id="dont-show-again"
            label="Don't show again"
            isChecked={dontShowModalValue}
            onChange={(checked) => setDontShowModalValue(checked)}
          />
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default StopNotebookConfirmModal;

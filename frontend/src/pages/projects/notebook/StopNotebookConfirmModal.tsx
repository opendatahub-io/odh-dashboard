import * as React from 'react';
import { Button, Checkbox, Flex, FlexItem, Modal, Stack, StackItem } from '@patternfly/react-core';
import NotebookRouteLink from './NotebookRouteLink';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';
import { NotebookState } from './types';

type StopNotebookConfirmProps = {
  isOpen: boolean;
  notebookState: NotebookState;
  onClose: (confirmStatus: boolean) => void;
};

const StopNotebookConfirmModal: React.FC<StopNotebookConfirmProps> = ({
  isOpen,
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
        {notebook && isRunning && (
          <StackItem>
            <Flex>
              <FlexItem spacer={{ default: 'spacerXs' }}>To save changes, access your</FlexItem>
              <FlexItem spacer={{ default: 'spacerNone' }}>
                <NotebookRouteLink label="workbench" notebook={notebook} isRunning isLarge />
              </FlexItem>
              <FlexItem spacer={{ default: 'spacerNone' }}>.</FlexItem>
            </Flex>
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

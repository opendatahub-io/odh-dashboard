import * as React from 'react';
import { Button, Checkbox, Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
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

  return (
    <Modal
      variant="small"
      title="Stop workbench?"
      data-testid="stop-workbench-modal"
      isOpen
      onClose={() => onBeforeClose(false)}
      actions={[
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
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          Any unsaved changes to the <strong>{getDisplayNameFromK8sResource(notebook)}</strong>{' '}
          workbench will be lost.
        </StackItem>
        {isRunning && (
          <StackItem>
            <Flex>
              <FlexItem spacer={{ default: 'spacerXs' }}>To save changes, </FlexItem>
              <FlexItem spacer={{ default: 'spacerNone' }}>
                <NotebookRouteLink label="open the workbench" notebook={notebook} isRunning />
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
            onChange={(e, checked) => setDontShowModalValue(checked)}
          />
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default StopNotebookConfirmModal;

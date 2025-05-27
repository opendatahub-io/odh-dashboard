import {
  Modal,
  ModalHeader,
  ModalBody,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Checkbox,
  ModalFooter,
} from '@patternfly/react-core';
import * as React from 'react';

type StopWorkbenchModalProps = {
  workbenchName: React.ReactNode;
  isRunning: boolean;
  modalActions: React.ReactNode[];
  link: React.ReactNode;
  dontShowModalValue: boolean;
  onBeforeClose: (confirmStatus: boolean) => void;
  setDontShowModalValue: (value: boolean) => void;
  title?: string;
};

const StopWorkbenchModal: React.FC<StopWorkbenchModalProps> = ({
  workbenchName,
  isRunning,
  modalActions,
  dontShowModalValue,
  setDontShowModalValue,
  onBeforeClose,
  link,
  title = 'Stop workbench?',
}) => (
  <Modal
    variant="small"
    data-testid="stop-workbench-modal"
    isOpen
    onClose={() => onBeforeClose(false)}
  >
    <ModalHeader title={title} />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>Any unsaved changes to the {workbenchName} will be lost.</StackItem>
        {isRunning && (
          <StackItem>
            <Flex>
              <FlexItem spacer={{ default: 'spacerXs' }}>To save changes, </FlexItem>
              <FlexItem spacer={{ default: 'spacerNone' }}>{link}</FlexItem>
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
    </ModalBody>
    <ModalFooter>{modalActions}</ModalFooter>
  </Modal>
);

export default StopWorkbenchModal;

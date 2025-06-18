import {
  ModalBody,
  Modal,
  StackItem,
  ModalHeader,
  Stack,
  ModalFooter,
  Checkbox,
  FlexItem,
  Flex,
} from '@patternfly/react-core';
import React from 'react';

type ConfirmStopModalProps = {
  modalActions: React.ReactNode[];
  onBeforeClose: (confirmStatus: boolean) => void;
  title?: string;
  dataTestId?: string;
  message: React.ReactNode;
  dontShowModalValue: boolean;
  setDontShowModalValue: (value: boolean) => void;
  isRunning?: boolean;
  link?: React.ReactNode;
  saveChanges?: boolean;
};

const ConfirmStopModal: React.FC<ConfirmStopModalProps> = ({
  modalActions,
  onBeforeClose,
  title = 'Stop?',
  dataTestId = 'confirm-stop-modal',
  message,
  dontShowModalValue,
  setDontShowModalValue,
  isRunning = false,
  link,
  saveChanges = false,
}) => (
  <Modal variant="small" data-testid={dataTestId} isOpen onClose={() => onBeforeClose(false)}>
    <ModalHeader title={title} />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>{message}</StackItem>
        {saveChanges && isRunning && link && (
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
            data-testid="dont-show-again-checkbox"
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

export default ConfirmStopModal;

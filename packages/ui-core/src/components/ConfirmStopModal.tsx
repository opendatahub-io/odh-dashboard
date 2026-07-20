import { Checkbox, Flex, FlexItem, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import ContentModal, { type ButtonAction } from './ContentModal';

type ConfirmStopModalProps = {
  buttonActions: ButtonAction[];
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
  buttonActions,
  onBeforeClose,
  title = 'Stop?',
  dataTestId = 'confirm-stop-modal',
  message,
  dontShowModalValue,
  setDontShowModalValue,
  isRunning = false,
  link,
  saveChanges = false,
}) => {
  const contents = (
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
  );

  return (
    <ContentModal
      onClose={() => onBeforeClose(false)}
      title={title}
      contents={contents}
      buttonActions={buttonActions}
      variant="small"
      dataTestId={dataTestId}
    />
  );
};

export default ConfirmStopModal;

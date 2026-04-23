import React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

type ArchiveRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isArchiving: boolean;
  runName?: string;
  namespace: string;
};

const ArchiveRunModal: React.FC<ArchiveRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isArchiving,
  runName,
  namespace,
}) => {
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const confirmMessage = runName ?? '';
  const isDisabled = confirmInputValue.trim() !== confirmMessage || isArchiving;

  const handleClose = React.useCallback(() => {
    setConfirmInputValue('');
    onClose();
  }, [onClose]);

  return (
    <Modal variant="small" isOpen={isOpen} onClose={handleClose} data-testid="archive-run-modal">
      <ModalHeader title="Archive AutoML optimization run?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            The run will be archived. It can be restored from the Pipelines{' '}
            <Link to={`/develop-train/pipelines/runs/${namespace}/runs/archived`}>
              archived runs
            </Link>{' '}
            view.
          </StackItem>
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{confirmMessage}</strong> to confirm archiving:
              </FlexItem>
              <TextInput
                id="confirm-archive-input"
                data-testid="confirm-archive-input"
                aria-label="confirm archive input"
                value={confirmInputValue}
                onChange={(_e, newValue) => setConfirmInputValue(newValue)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isDisabled) {
                    onConfirm();
                  }
                }}
              />
            </Flex>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onConfirm}
          isDisabled={isDisabled}
          isLoading={isArchiving}
          spinnerAriaValueText="Archiving run"
          data-testid="confirm-archive-run-button"
        >
          Archive
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isArchiving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ArchiveRunModal;

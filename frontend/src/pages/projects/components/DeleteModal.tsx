import * as React from 'react';
import { Alert, Button, Flex, FlexItem, Stack, StackItem, TextInput } from '@patternfly/react-core';
import TrackedModal, { TrackedModalProps } from '~/pages/projects/components/TrackedModal';

type DeleteModalProps = {
  title: string;
  isOpen: boolean;
  deleting: boolean;
  onDelete: () => void;
  deleteName: string;
  submitButtonLabel?: string;
  error?: Error;
  children: React.ReactNode;
  testId?: string;
} & TrackedModalProps;

const DeleteModal: React.FC<DeleteModalProps> = ({
  children,
  title,
  isOpen,
  onClose,
  deleting,
  onDelete,
  deleteName,
  error,
  submitButtonLabel = 'Delete',
  testId,
}) => {
  const [value, setValue] = React.useState('');

  const deleteNameSanitized = React.useMemo(
    () => deleteName.trim().replace(/\s+/g, ' '),
    [deleteName],
  );

  const onBeforeClose = (deleted: boolean) => {
    if (deleted) {
      onDelete();
      onClose(false, true);
    } else {
      onClose(true);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setValue('');
    }
  }, [isOpen]);

  return (
    <TrackedModal
      title={title}
      titleIconVariant="warning"
      isOpen={isOpen}
      trackingEventName="TODO"
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="delete-button"
          variant="danger"
          isLoading={deleting}
          isDisabled={deleting || value.trim() !== deleteNameSanitized}
          onClick={() => onBeforeClose(true)}
        >
          {submitButtonLabel}
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
      variant="small"
      data-testid={testId || 'delete-modal'}
    >
      <Stack hasGutter>
        <StackItem>{children}</StackItem>

        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{deleteNameSanitized}</strong> to confirm deletion:
            </FlexItem>

            <TextInput
              id="delete-modal-input"
              data-testid="delete-modal-input"
              aria-label="Delete modal input"
              value={value}
              onChange={(_e, newValue) => setValue(newValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && value.trim() === deleteNameSanitized && !deleting) {
                  onDelete();
                }
              }}
            />
          </Flex>
        </StackItem>

        {error && (
          <StackItem>
            <Alert
              data-testid="delete-model-error-message-alert"
              title={`Error deleting ${deleteNameSanitized}`}
              isInline
              variant="danger"
            >
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </TrackedModal>
  );
};

export default DeleteModal;

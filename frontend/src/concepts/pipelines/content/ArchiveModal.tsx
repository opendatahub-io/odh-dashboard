import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem, TextInput } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';

interface ArchiveModalProps {
  confirmMessage: string;
  title: string;
  alertTitle: string;
  onCancel: () => void;
  onSubmit: () => Promise<void[]>;
  children: React.ReactNode;
  testId: string;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  onCancel,
  onSubmit,
  confirmMessage,
  title,
  alertTitle,
  children,
  testId,
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const isDisabled = confirmInputValue.trim() !== confirmMessage || isSubmitting;

  const onClose = React.useCallback(() => {
    setConfirmInputValue('');
    onCancel();
  }, [onCancel]);

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await onSubmit();
      refreshAllAPI();
      setIsSubmitting(false);
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      setIsSubmitting(false);
    }
  }, [onSubmit, onClose, refreshAllAPI]);

  return (
    <Modal
      isOpen
      title={title}
      titleIconVariant="warning"
      variant="small"
      onClose={onClose}
      footer={
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={onConfirm}
          submitLabel="Archive"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle={alertTitle}
        />
      }
      data-testid={testId}
    >
      <Stack hasGutter>
        {children}
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
    </Modal>
  );
};

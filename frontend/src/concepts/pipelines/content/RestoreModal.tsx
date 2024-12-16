import React from 'react';
import { Button } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';

interface RestoreModalProps {
  onCancel: () => void;
  onSubmit: () => Promise<void[]>;
  title: string;
  alertTitle: string;
  children: React.ReactNode;
  testId: string;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  onCancel,
  onSubmit,
  title,
  children,
  testId,
  alertTitle,
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
      refreshAllAPI();
      setIsSubmitting(false);
      onCancel();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      setIsSubmitting(false);
    }
  }, [onSubmit, refreshAllAPI, onCancel]);

  return (
    <Modal
      isOpen
      title={title}
      variant="small"
      onClose={onCancel}
      footer={
        <DashboardModalFooter
          onSubmit={onConfirm}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          submitLabel="Restore"
          onCancel={onCancel}
          alertTitle={alertTitle}
          error={error}
        />
      }
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Restore
        </Button>,
        <Button key="cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      data-testid={testId}
    >
      {children}
    </Modal>
  );
};

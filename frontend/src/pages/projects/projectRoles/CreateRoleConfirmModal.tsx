import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';

type CreateRoleConfirmModalProps = {
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

const CreateRoleConfirmModal: React.FC<CreateRoleConfirmModalProps> = ({ onConfirm, onClose }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const handleConfirm = React.useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create role'));
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm]);

  return (
    <ContentModal
      title="Create empty role?"
      titleIconVariant="warning"
      variant="small"
      dataTestId="create-role-confirm-modal"
      onClose={onClose}
      error={error}
      alertTitle="Error creating role"
      buttonActions={[
        {
          label: 'Create role',
          onClick: handleConfirm,
          variant: 'primary',
          isLoading: isSubmitting,
          isDisabled: isSubmitting,
          dataTestId: 'confirm-create-button',
        },
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'link',
          isDisabled: isSubmitting,
          dataTestId: 'confirm-cancel-button',
        },
      ]}
      contents={
        <>This role has no rules and won&apos;t grant any permissions. You can add rules later.</>
      }
    />
  );
};

export default CreateRoleConfirmModal;

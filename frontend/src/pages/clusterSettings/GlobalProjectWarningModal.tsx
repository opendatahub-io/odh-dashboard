import * as React from 'react';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';

type GlobalProjectWarningModalVariant = 'clear' | 'switch';

type GlobalProjectWarningModalProps = {
  variant: GlobalProjectWarningModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

const MODAL_CONTENT: Record<
  GlobalProjectWarningModalVariant,
  { title: string; body: string; confirmLabel: string }
> = {
  clear: {
    title: 'Clear the global project?',
    body: 'Clearing the global project selection will make shared prompt templates unavailable to users in this cluster. You can assign a global project again at any time.',
    confirmLabel: 'Clear global project',
  },
  switch: {
    title: 'Change the global project?',
    body: 'Assigning a different project as the global project will change the prompt templates available to all users in this cluster.',
    confirmLabel: 'Change global project',
  },
};

const GlobalProjectWarningModal: React.FC<GlobalProjectWarningModalProps> = ({
  variant,
  onConfirm,
  onCancel,
}) => {
  const { title, body, confirmLabel } = MODAL_CONTENT[variant];

  return (
    <ContentModal
      title={title}
      onClose={onCancel}
      variant="small"
      dataTestId="global-project-warning-modal"
      contents={body}
      buttonActions={[
        {
          label: confirmLabel,
          onClick: onConfirm,
          variant: 'primary',
          dataTestId: 'global-project-warning-confirm',
        },
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'link',
          dataTestId: 'global-project-warning-cancel',
        },
      ]}
    />
  );
};

export default GlobalProjectWarningModal;

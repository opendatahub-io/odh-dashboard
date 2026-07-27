import * as React from 'react';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';

type DisableLastImageModalProps = {
  imageName: string;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
};

const DisableLastImageModal: React.FC<DisableLastImageModalProps> = ({
  imageName,
  onConfirm,
  onClose,
  isSubmitting = false,
}) => (
  <ContentModal
    title="Disable last enabled image?"
    titleIconVariant="warning"
    variant="small"
    dataTestId="disable-last-image-modal"
    onClose={onClose}
    buttonActions={[
      {
        label: 'Disable',
        onClick: onConfirm,
        variant: 'primary',
        isLoading: isSubmitting,
        isDisabled: isSubmitting,
        dataTestId: 'confirm-disable-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        isDisabled: isSubmitting,
        dataTestId: 'cancel-disable-button',
      },
    ]}
    contents={
      <>
        <div>
          Disabling <strong>{imageName}</strong> will leave no workbench images enabled. Users may
          not be able to create new workbenches until an image is enabled.
        </div>
      </>
    }
  />
);

export default DisableLastImageModal;

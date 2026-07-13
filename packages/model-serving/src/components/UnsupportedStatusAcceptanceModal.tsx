import * as React from 'react';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';

type UnsupportedStatusAcceptanceModalProps = {
  resourceTypeLabel: string;
  onAccept: () => void;
  onClose: () => void;
};

const UnsupportedStatusAcceptanceModal: React.FC<UnsupportedStatusAcceptanceModalProps> = ({
  resourceTypeLabel,
  onAccept,
  onClose,
}) => (
  <ContentModal
    title={`Enable limited support ${resourceTypeLabel}`}
    variant="small"
    onClose={onClose}
    dataTestId="unsupported-status-acceptance-modal"
    contents={`By enabling this ${resourceTypeLabel}, you acknowledge that support coverage differs from standard support coverages.`}
    buttonActions={[
      {
        label: 'Enable',
        onClick: onAccept,
        variant: 'primary',
        dataTestId: 'unsupported-status-accept-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        dataTestId: 'unsupported-status-cancel-button',
      },
    ]}
  />
);

export default UnsupportedStatusAcceptanceModal;

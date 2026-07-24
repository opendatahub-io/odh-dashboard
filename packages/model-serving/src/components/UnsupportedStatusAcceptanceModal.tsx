import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';

export type UnsupportedStatusDismissAction = 'cancel' | 'close';

type UnsupportedStatusAcceptanceModalProps = {
  resourceTypeLabel: string;
  onAccept: () => void;
  onClose: (dismissAction: UnsupportedStatusDismissAction) => void;
};

const UnsupportedStatusAcceptanceModal: React.FC<UnsupportedStatusAcceptanceModalProps> = ({
  resourceTypeLabel,
  onAccept,
  onClose,
}) => {
  const [isChecked, setIsChecked] = React.useState(false);

  return (
    <ContentModal
      title={`Enable limited-support ${resourceTypeLabel}?`}
      variant="small"
      onClose={() => onClose('close')}
      dataTestId="unsupported-status-acceptance-modal"
      contents={
        <>
          The support coverage for this {resourceTypeLabel} is limited to 1 month after release.
          <Checkbox
            id="unsupported-status-acceptance-checkbox"
            data-testid="unsupported-status-acceptance-checkbox"
            label="I understand"
            isChecked={isChecked}
            onChange={(_event, checked) => setIsChecked(checked)}
            className="pf-v6-u-mt-md"
          />
        </>
      }
      buttonActions={[
        {
          label: 'Enable',
          onClick: onAccept,
          variant: 'primary',
          dataTestId: 'unsupported-status-accept-button',
          isDisabled: !isChecked,
        },
        {
          label: 'Cancel',
          onClick: () => onClose('cancel'),
          variant: 'link',
          dataTestId: 'unsupported-status-cancel-button',
        },
      ]}
    />
  );
};

export default UnsupportedStatusAcceptanceModal;

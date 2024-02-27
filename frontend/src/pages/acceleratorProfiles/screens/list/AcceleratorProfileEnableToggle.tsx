import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import DisableAcceleratorProfileModal from '~/pages/acceleratorProfiles/screens/list/DisableAcceleratorProfileModal';
import { updateAcceleratorProfile } from '~/services/acceleratorProfileService';
import useNotification from '~/utilities/useNotification';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';

type AcceleratorProfileEnableToggleProps = {
  enabled: boolean;
  name: string;
};

const AcceleratorProfileEnableToggle: React.FC<AcceleratorProfileEnableToggleProps> = ({
  enabled,
  name,
}) => {
  const label = enabled ? 'enabled' : 'stopped';
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(enabled);
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  const handleChange = (checked: boolean) => {
    setLoading(true);
    updateAcceleratorProfile(name, {
      enabled: checked,
    })
      .then(() => {
        fireTrackingEvent(`AcceleratorProfile ${checked ? 'Enabled' : 'Disabled'}`, {
          success: true,
        });
        setEnabled(checked);
      })
      .catch((e) => {
        fireTrackingEvent(`AcceleratorProfile ${checked ? 'Enabled' : 'Disabled'}`, {
          success: false,
          error: e.message,
        });

        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the accelerator profile`,
          e.message,
        );
        setEnabled(!checked);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Switch
        aria-label={label}
        id={`${name}-enable-switch`}
        isChecked={isEnabled}
        isDisabled={isLoading}
        onChange={() => {
          if (isEnabled) {
            setIsModalOpen(true);
          } else {
            handleChange(true);
          }
        }}
      />
      <DisableAcceleratorProfileModal
        isOpen={isModalOpen}
        onClose={(confirmStatus) => {
          if (confirmStatus) {
            handleChange(false);
          }
          setIsModalOpen(false);
        }}
      />
    </>
  );
};

export default AcceleratorProfileEnableToggle;

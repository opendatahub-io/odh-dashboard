import React from 'react';
import { Switch } from '@patternfly/react-core';
import useNotification from '~/utilities/useNotification';
import { toggleHardwareProfileEnablement } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';

import DisableHardwareProfileModal from '~/pages/hardwareProfiles/DisableHardwareProfileModal';

type HardwareProfileEnableToggleProps = {
  hardwareProfile: HardwareProfileKind;
  refreshHardwareProfiles: () => void;
};

const HardwareProfileEnableToggle: React.FC<HardwareProfileEnableToggleProps> = ({
  hardwareProfile,
  refreshHardwareProfiles,
}) => {
  const { enabled } = hardwareProfile.spec;
  const label = enabled ? 'enabled' : 'stopped';
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEnabled, setEnabled] = React.useState(enabled);
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  const handleChange = (checked: boolean) => {
    setLoading(true);
    toggleHardwareProfileEnablement(
      hardwareProfile.metadata.name,
      hardwareProfile.metadata.namespace,
      checked,
    )
      .then(() => {
        setEnabled(checked);
        refreshHardwareProfiles();
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the hardware profile`,
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
        data-testid="enable-switch"
        id={`${hardwareProfile.metadata.name}-enable-switch`}
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
      {isModalOpen ? (
        <DisableHardwareProfileModal
          data-testid="disable-hardware-profile-modal"
          onClose={(confirmStatus) => {
            if (confirmStatus) {
              handleChange(false);
            }
            setIsModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

export default HardwareProfileEnableToggle;

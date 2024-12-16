import React from 'react';
import { Switch } from '@patternfly/react-core';
import useNotification from '~/utilities/useNotification';
import { toggleHardwareProfileEnablement } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';

type HardwareProfileEnableToggleProps = {
  hardwareProfile: HardwareProfileKind;
  refreshHardwareProfiles: () => void;
};

const HardwareProfileEnableToggle: React.FC<HardwareProfileEnableToggleProps> = ({
  hardwareProfile,
  refreshHardwareProfiles,
}) => {
  const { enabled } = hardwareProfile.spec;
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
    <Switch
      aria-label={enabled ? 'enabled' : 'stopped'}
      data-testid="enable-switch"
      id={`${hardwareProfile.metadata.name}-enable-switch`}
      isChecked={isEnabled}
      isDisabled={isLoading}
      onChange={(_e, checked) => handleChange(checked)}
    />
  );
};

export default HardwareProfileEnableToggle;

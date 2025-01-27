import React from 'react';
import { Switch } from '@patternfly/react-core';
import useNotification from '~/utilities/useNotification';
import { toggleHardwareProfileEnablement } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';
import { HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE } from './nodeResource/const';

type HardwareProfileEnableToggleProps = {
  hardwareProfile: HardwareProfileKind;
};

const HardwareProfileEnableToggle: React.FC<HardwareProfileEnableToggleProps> = ({
  hardwareProfile,
}) => {
  const { enabled } = hardwareProfile.spec;
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  const handleChange = (checked: boolean) => {
    setLoading(true);
    toggleHardwareProfileEnablement(
      hardwareProfile.metadata.name,
      hardwareProfile.metadata.namespace,
      checked,
    )
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the hardware profile`,
          e.message,
        );
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
      isChecked={enabled}
      isDisabled={
        (typeof hardwareProfile.spec.warning !== 'undefined' &&
          !hardwareProfile.spec.warning.message.includes(
            HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE,
          )) ||
        isLoading
      }
      onChange={(_e, checked) => handleChange(checked)}
    />
  );
};

export default HardwareProfileEnableToggle;

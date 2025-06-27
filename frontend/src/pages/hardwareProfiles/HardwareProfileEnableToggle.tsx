import React from 'react';
import { Switch } from '@patternfly/react-core';
import useNotification from '#~/utilities/useNotification';
import { HardwareProfileModel, toggleHardwareProfileEnablement } from '#~/api';
import { HardwareProfileKind } from '#~/k8sTypes';
import { HardwareProfileWarningType } from '#~/concepts/hardwareProfiles/types';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { isHardwareProfileEnabled, validateProfileWarning } from './utils';

type HardwareProfileEnableToggleProps = {
  hardwareProfile: HardwareProfileKind;
  isDisabled?: boolean;
};

const HardwareProfileEnableToggle: React.FC<HardwareProfileEnableToggleProps> = ({
  hardwareProfile,
  isDisabled = false,
}) => {
  const hardwareProfileWarnings = validateProfileWarning(hardwareProfile);
  const enabled = isHardwareProfileEnabled(hardwareProfile);
  const warning = hardwareProfileWarnings.some(
    (hardwareProfileWarning) =>
      hardwareProfileWarning.type !==
      HardwareProfileWarningType.HARDWARE_PROFILES_MISSING_CPU_MEMORY,
  );
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();
  const [hasAccess, hasLoadedAccess] = useAccessAllowed(
    verbModelAccess('patch', HardwareProfileModel),
  );
  const canNotToggleSwitch = warning || isLoading || !hasAccess || !hasLoadedAccess || isDisabled;

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
      isChecked={enabled && !warning}
      isDisabled={canNotToggleSwitch}
      onChange={(_e, checked) => handleChange(checked)}
    />
  );
};

export default HardwareProfileEnableToggle;

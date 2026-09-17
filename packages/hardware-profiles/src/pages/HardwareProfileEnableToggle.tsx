import React from 'react';
import { Flex, FlexItem, Switch } from '@patternfly/react-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import DashboardHelpTooltip from '@odh-dashboard/ui-core/components/DashboardHelpTooltip';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { HardwareProfileModel, toggleHardwareProfileEnablement } from '@odh-dashboard/internal/api';
import { HardwareProfileWarningType } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import { useAccessAllowed, verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR';
import { isHardwareProfileEnabled, validateProfileWarning } from './utils';
import { DRA_HARDWARE_PROFILE_TOGGLE_DISABLED_MESSAGE } from './const';
import { isDRAHardwareProfile } from '../../shared/utils';

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
  const isDRA = isDRAHardwareProfile(hardwareProfile);
  const canNotToggleSwitch =
    warning || isLoading || !hasAccess || !hasLoadedAccess || isDisabled || isDRA;

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

  const switchInput = (
    <Switch
      aria-label={enabled ? 'enabled' : 'stopped'}
      data-testid="enable-switch"
      id={`${hardwareProfile.metadata.name}-enable-switch`}
      isChecked={enabled && !warning}
      isDisabled={canNotToggleSwitch}
      onChange={(_e, checked) => handleChange(checked)}
    />
  );

  return isDRA ? (
    <Flex
      display={{ default: 'inlineFlex' }}
      alignItems={{ default: 'alignItemsCenter' }}
      spaceItems={{ default: 'spaceItemsSm' }}
      flexWrap={{ default: 'nowrap' }}
    >
      <FlexItem>{switchInput}</FlexItem>
      <FlexItem>
        <DashboardHelpTooltip content={DRA_HARDWARE_PROFILE_TOGGLE_DISABLED_MESSAGE} />
      </FlexItem>
    </Flex>
  ) : (
    switchInput
  );
};

export default HardwareProfileEnableToggle;

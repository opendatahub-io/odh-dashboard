import React from 'react';
import { Label, Popover, Alert } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { ResourceType } from '#~/concepts/hardwareProfiles/types';
import { HardwareProfileBindingState, HARDWARE_PROFILE_BINDING_CONFIG } from './const';

const HARDWARE_PROFILE_BINDING_ICONS: Record<HardwareProfileBindingState, React.ReactNode> = {
  [HardwareProfileBindingState.DELETED]: <ExclamationCircleIcon />,
  [HardwareProfileBindingState.DISABLED]: <ExclamationTriangleIcon />,
  [HardwareProfileBindingState.UPDATED]: <InfoCircleIcon />,
};

type HardwareProfileBindingStateLabelProps = {
  hardwareProfileBindingState: HardwareProfileBindingState;
  hardwareProfileName: string;
  resourceType: ResourceType;
  isRunning?: boolean;
};

const HardwareProfileBindingStateLabel: React.FC<HardwareProfileBindingStateLabelProps> = ({
  hardwareProfileBindingState,
  hardwareProfileName,
  resourceType,
  isRunning = false,
}) => {
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const config = HARDWARE_PROFILE_BINDING_CONFIG[hardwareProfileBindingState];
  const icon = HARDWARE_PROFILE_BINDING_ICONS[hardwareProfileBindingState];
  const bodyText = config.getBodyText({ name: hardwareProfileName, resourceType, isRunning });

  return (
    <Popover
      aria-label="Hardware profile state popover"
      headerContent={
        <Alert
          variant={config.alertVariant}
          isInline
          isPlain
          title={config.title}
          data-testid={`${config.testId}-popover-title`}
        />
      }
      bodyContent={<p data-testid={`${config.testId}-popover-body`}>{bodyText}</p>}
      shouldOpen={() => setIsPopoverVisible(true)}
      shouldClose={() => setIsPopoverVisible(false)}
      isVisible={isPopoverVisible}
    >
      <Label
        onClick={(e) => e.preventDefault()}
        color={config.labelColor}
        icon={icon}
        isCompact
        data-testid={config.testId}
      >
        {config.labelText}
      </Label>
    </Popover>
  );
};

export default HardwareProfileBindingStateLabel;

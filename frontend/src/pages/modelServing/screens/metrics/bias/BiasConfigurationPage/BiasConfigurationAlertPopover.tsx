import * as React from 'react';
import { Button, Icon, Popover } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CONFIGURATION_DESC,
  EMPTY_BIAS_CONFIGURATION_TITLE,
} from '#~/pages/modelServing/screens/metrics/const';

type BiasConfigurationAlertPopoverProps = {
  onConfigure: () => void;
};

const BiasConfigurationAlertPopover: React.FC<BiasConfigurationAlertPopoverProps> = ({
  onConfigure,
}) => (
  <Popover
    aria-label={EMPTY_BIAS_CONFIGURATION_TITLE}
    alertSeverityVariant="info"
    headerContent={EMPTY_BIAS_CONFIGURATION_TITLE}
    headerIcon={<InfoCircleIcon />}
    bodyContent={EMPTY_BIAS_CONFIGURATION_DESC}
    footerContent={
      <Button variant="secondary" size="sm" onClick={onConfigure}>
        Configure
      </Button>
    }
  >
    <Icon status="info">
      <InfoCircleIcon />
    </Icon>
  </Popover>
);

export default BiasConfigurationAlertPopover;

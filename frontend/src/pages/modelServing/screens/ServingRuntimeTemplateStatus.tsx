import * as React from 'react';
import { Alert, Label, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ServingRuntimeTemplateStatusLabel } from './const';

const ServingRuntimeTemplateStatus: React.FC = () => {
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);

  return (
    <Popover
      isVisible={isPopoverVisible}
      shouldOpen={() => setIsPopoverVisible(true)}
      shouldClose={() => setIsPopoverVisible(false)}
      headerContent={<Alert variant="warning" isInline isPlain title="Template removed" />}
      bodyContent={
        <p>
          The serving runtime template used to create this deployment is no longer available. The
          deployment will continue to run, but you cannot create new deployments using this
          template.
        </p>
      }
    >
      <Label
        data-testid="serving-runtime-template-status-label"
        status="warning"
        icon={<ExclamationTriangleIcon />}
        isCompact
      >
        {ServingRuntimeTemplateStatusLabel.TEMPLATE_REMOVED}
      </Label>
    </Popover>
  );
};

export default ServingRuntimeTemplateStatus;

import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';

export const OpenshiftDefaultLabel: React.FC = () => (
  <Tooltip content="This is the default storage class in OpenShift.">
    <Label color="green" isCompact data-testid="openshift-sc-default-label">
      Default
    </Label>
  </Tooltip>
);

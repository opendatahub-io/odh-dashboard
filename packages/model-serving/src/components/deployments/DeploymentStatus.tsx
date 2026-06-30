import React from 'react';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { ToggleState } from '@odh-dashboard/ui-core';
import { DeploymentEndpointsPopupButton } from './DeploymentEndpointsPopupButton';
import { Deployment } from '../../../extension-points';

type DeploymentStatusProps = {
  deployment: Deployment;
  stoppedStates?: ToggleState;
};

const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ deployment, stoppedStates }) => {
  if (stoppedStates?.isStarting) {
    return 'Pending';
  }

  if (
    deployment.status?.state === ModelDeploymentState.FAILED_TO_LOAD ||
    stoppedStates?.isStopped ||
    stoppedStates?.isStopping
  ) {
    return 'Not available';
  }

  return (
    <DeploymentEndpointsPopupButton
      endpoints={deployment.endpoints}
      loading={stoppedStates?.isStarting ?? false}
      apiProtocol={deployment.apiProtocol}
    />
  );
};

export default DeploymentStatus;

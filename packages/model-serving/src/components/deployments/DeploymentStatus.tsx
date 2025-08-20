import React from 'react';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { ToggleState } from '@odh-dashboard/internal/components/StateActionToggle';
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
    />
  );
};

export default DeploymentStatus;

import React from 'react';
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { DeploymentEndpointsPopupButton } from './DeploymentEndpointsPopupButton';
import { Deployment } from '../../../extension-points';

type DeploymentStatusProps = {
  deployment: Deployment;
};

const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ deployment }) => {
  const isLoading =
    deployment.status?.state === InferenceServiceModelState.LOADING ||
    deployment.status?.state === InferenceServiceModelState.PENDING;

  if (isLoading) {
    return 'Pending...';
  }

  if (deployment.status?.state === InferenceServiceModelState.FAILED_TO_LOAD) {
    return '-';
  }

  return <DeploymentEndpointsPopupButton endpoints={deployment.endpoints} loading={isLoading} />;
};

export default DeploymentStatus;

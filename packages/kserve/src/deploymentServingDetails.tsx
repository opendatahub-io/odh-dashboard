import React from 'react';
import InferenceServiceServingRuntime from '@odh-dashboard/internal/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import type { KServeDeployment } from './deployments';

type Props = {
  deployment: KServeDeployment;
};

const DeploymentServingDetails: React.FC<Props> = ({ deployment }) => (
  <InferenceServiceServingRuntime servingRuntime={deployment.server} />
);

export default DeploymentServingDetails;

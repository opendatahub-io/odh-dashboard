import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import InferenceServiceServingRuntime from '@odh-dashboard/internal/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import type { KServeDeployment } from '../deployments';

type Props = {
  deployment: KServeDeployment;
};

const DeploymentServingDetails: React.FC<Props> = ({ deployment }) => (
  <InferenceServiceServingRuntime
    servingRuntime={deployment.server}
    inferenceService={deployment.model}
  />
);

export default DeploymentServingDetails;

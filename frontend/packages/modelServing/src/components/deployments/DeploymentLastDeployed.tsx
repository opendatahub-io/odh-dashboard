import React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { Deployment, ModelResourceType } from '../../../extension-points';
import { LastDeployed } from '../../../../../src/components/LastDeployed.tsx';

type ModelWithStatus = ModelResourceType & {
  status?: { conditions?: { type: string; lastTransitionTime: string }[] };
  metadata: ModelResourceType['metadata'] & K8sResourceCommon['metadata'];
};

type DeploymentLastDeployedProps = {
  deployment: Deployment<ModelWithStatus>;
};

const DeploymentLastDeployed: React.FC<DeploymentLastDeployedProps> = ({
  deployment: { model },
}) => <LastDeployed resource={model} />;

export default DeploymentLastDeployed;

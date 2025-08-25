import React from 'react';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { Deployment, isDeployedModelServingDetails } from '../../../extension-points';
import { useDeploymentExtension } from '../../concepts/extensionUtils';

type DeployedModelsVersionProps = {
  deployment: Deployment;
};

const DeployedModelsVersion: React.FC<DeployedModelsVersionProps> = ({ deployment }) => {
  const servingDetailsExtension = useDeploymentExtension(isDeployedModelServingDetails, deployment);

  if (servingDetailsExtension) {
    return (
      <LazyCodeRefComponent
        component={servingDetailsExtension.properties.ServingDetailsComponent}
        props={{ deployment }}
      />
    );
  }

  return deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-';
};

export default DeployedModelsVersion;

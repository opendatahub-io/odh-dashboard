import React from 'react';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import type { ExtensionDataEntry } from '../../concepts/extensionHelpers/usePlatformExtensionDataMap';
import { Deployment, type DeployedModelServingDetails } from '../../../extension-points';

type DeployedModelsVersionProps = {
  deployment: Deployment;
  servingDetailsEntry?: ExtensionDataEntry<DeployedModelServingDetails>;
};

const DeployedModelsVersion: React.FC<DeployedModelsVersionProps> = ({
  deployment,
  servingDetailsEntry,
}) => {
  if (servingDetailsEntry) {
    return (
      <LazyCodeRefComponent
        component={servingDetailsEntry.extension.properties.ServingDetailsComponent}
        props={{ deployment, data: servingDetailsEntry.data }}
      />
    );
  }

  return deployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'] ?? '-';
};

export default DeployedModelsVersion;

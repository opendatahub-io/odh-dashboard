import React from 'react';
import { Td } from '@patternfly/react-table';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Deployment,
  isModelServingDeploymentFormDataExtension,
} from '@odh-dashboard/model-serving/extension-points';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({ deployment }) {
    const [formDataExtensions] = useResolvedExtensions(isModelServingDeploymentFormDataExtension);

    const formDataExtension = React.useMemo(
      () =>
        formDataExtensions.find(
          (ext) => ext.properties.platform === deployment.modelServingPlatformId,
        ),
      [formDataExtensions, deployment.modelServingPlatformId],
    );

    const hardwareProfileConfig = React.useMemo(
      () => formDataExtension?.properties.extractHardwareProfileConfig(deployment),
      [formDataExtension, deployment],
    );

    const containerResources = hardwareProfileConfig?.[1];

    return (
      <Td dataLabel="Hardware profile">
        <HardwareProfileTableColumn
          namespace={deployment.model.metadata.namespace}
          resource={deployment.model}
          containerResources={containerResources}
          isActive={
            deployment.status?.stoppedStates?.isRunning ||
            deployment.status?.stoppedStates?.isStarting
          }
        />
      </Td>
    );
  });

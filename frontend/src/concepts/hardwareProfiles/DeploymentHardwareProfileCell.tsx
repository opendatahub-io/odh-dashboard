import React from 'react';
import { Td } from '@patternfly/react-table';
// eslint-disable-next-line import/no-extraneous-dependencies
import { type Deployment, ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { UseAssignHardwareProfileResult } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '#~/concepts/hardwareProfiles/const';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
  hardwareProfileOptions: UseAssignHardwareProfileResult<ModelResourceType>;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({ deployment, hardwareProfileOptions }) {
    const containerResources =
      hardwareProfileOptions.podSpecOptionsState.hardwareProfile.formData.resources;
    const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
      useHardwareProfileBindingState(
        deployment.model,
        MODEL_SERVING_VISIBILITY,
        deployment.model.metadata.namespace,
      );

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
          bindingState={{
            bindingStateInfo,
            bindingStateLoaded,
            loadError: bindingStateLoadError,
          }}
        />
      </Td>
    );
  });

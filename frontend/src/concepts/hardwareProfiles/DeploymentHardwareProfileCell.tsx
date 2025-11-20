import React from 'react';
import { Td } from '@patternfly/react-table';
// eslint-disable-next-line import/no-extraneous-dependencies
import { type Deployment, ModelResourceType } from '@odh-dashboard/model-serving/extension-points';
import HardwareProfileTableColumn from '#~/concepts/hardwareProfiles/HardwareProfileTableColumn';
import { useHardwareProfileBindingState } from '#~/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { useAssignHardwareProfile } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { CrPathConfig } from '#~/concepts/hardwareProfiles/types';
import { HardwareProfileKind } from '#~/k8sTypes.ts';
import { CustomWatchK8sResult } from '#~/types.ts';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
  hardwareProfilePaths?: CrPathConfig;
  projectHardwareProfiles?: CustomWatchK8sResult<HardwareProfileKind[]>;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({
    deployment,
    hardwareProfilePaths,
    projectHardwareProfiles,
  }) {
    const hardwareProfileOptions = useAssignHardwareProfile<ModelResourceType>(
      deployment.model,
      {
        visibleIn: MODEL_SERVING_VISIBILITY,
        paths: hardwareProfilePaths,
      },
      projectHardwareProfiles,
    );

    const containerResources =
      hardwareProfileOptions.podSpecOptionsState.hardwareProfile.formData.resources;
    const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
      useHardwareProfileBindingState(
        deployment.model,
        MODEL_SERVING_VISIBILITY,
        projectHardwareProfiles,
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

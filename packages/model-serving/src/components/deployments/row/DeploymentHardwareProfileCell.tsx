import React from 'react';
import { Td } from '@patternfly/react-table';
import HardwareProfileTableColumn from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileTableColumn';
import { useHardwareProfileBindingState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { useAssignHardwareProfile } from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import { type Deployment } from '../../../../extension-points';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
  hardwareProfilePaths?: CrPathConfig;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({ deployment, hardwareProfilePaths }) {
    const hardwareProfileOptions = useAssignHardwareProfile(deployment.model, {
      visibleIn: MODEL_SERVING_VISIBILITY,
      paths: hardwareProfilePaths,
    });

    const containerResources =
      hardwareProfileOptions.podSpecOptionsState.hardwareProfile.formData.resources;
    const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
      useHardwareProfileBindingState(deployment.model, MODEL_SERVING_VISIBILITY);

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

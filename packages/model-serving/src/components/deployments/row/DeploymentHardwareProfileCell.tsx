import React from 'react';
import { Td } from '@patternfly/react-table';
import HardwareProfileTableColumn from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileTableColumn';
import { useHardwareProfileBindingState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileBindingState';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import { type Deployment } from '../../../../extension-points';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({ deployment }) {
    const [bindingStateInfo, bindingStateLoaded, bindingStateLoadError] =
      useHardwareProfileBindingState(deployment.model, MODEL_SERVING_VISIBILITY);

    return (
      <Td dataLabel="Hardware profile">
        <HardwareProfileTableColumn
          namespace={deployment.model.metadata.namespace}
          resource={deployment.model}
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

import React from 'react';
import { Td } from '@patternfly/react-table';
import {
  HardwareProfileTableColumn,
  type HardwareProfileBindingStateInfo,
} from '@odh-dashboard/hardware-profiles/shared';
import { type Deployment } from '../../../../extension-points';

type DeploymentHardwareProfileCellProps = {
  deployment: Deployment;
  bindingStateInfo: HardwareProfileBindingStateInfo | null;
  bindingStateLoaded: boolean;
  bindingStateLoadError: Error | undefined;
};

export const DeploymentHardwareProfileCell: React.FC<DeploymentHardwareProfileCellProps> =
  React.memo(function DeploymentHardwareProfileCell({
    deployment,
    bindingStateInfo,
    bindingStateLoaded,
    bindingStateLoadError,
  }) {
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

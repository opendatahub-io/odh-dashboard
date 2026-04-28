import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { WorkloadKind } from '#~/k8sTypes';
import { getStatusInfo } from '#~/concepts/distributedWorkloads/utils';

export const WorkloadStatusLabel: React.FC<{ workload: WorkloadKind }> = ({ workload }) => {
  const statusInfo = getStatusInfo(workload);
  return (
    <Label
      variant="outline"
      color={statusInfo.color}
      status={statusInfo.labelStatus}
      icon={<statusInfo.icon />}
      style={{ width: 'fit-content' }}
    >
      {statusInfo.status}
    </Label>
  );
};

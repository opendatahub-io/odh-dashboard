import { LabelProps } from '@patternfly/react-core';
import React from 'react';
import {
  ExclamationTriangleIcon,
  PendingIcon,
  InProgressIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UnknownIcon,
} from '@patternfly/react-icons';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { WorkloadCondition, WorkloadKind } from '~/k8sTypes';

//Workload utilities
export type WorkloadStatusType =
  | 'Inadmissible'
  | 'Pending'
  | 'Running'
  | 'Succeeded'
  | 'Failed'
  | 'Unknown';

export type WorkloadStatusInfo = {
  status: WorkloadStatusType;
  message: string;
  color: LabelProps['color'];
  icon: React.ComponentClass<SVGIconProps>;
};

export const WorkloadStatusColorAndIcon: Record<
  WorkloadStatusType,
  Pick<WorkloadStatusInfo, 'color' | 'icon'>
> = {
  Inadmissible: { color: 'gold', icon: ExclamationTriangleIcon },
  Pending: { color: 'cyan', icon: PendingIcon },
  Running: { color: 'blue', icon: InProgressIcon },
  Succeeded: { color: 'green', icon: CheckCircleIcon },
  Failed: { color: 'red', icon: ExclamationCircleIcon },
  Unknown: { color: 'grey', icon: UnknownIcon },
};

export const getStatusInfo = (wl: WorkloadKind): WorkloadStatusInfo | null => {
  const conditions = wl.status?.conditions;
  const knownStatusConditions: Record<WorkloadStatusType, WorkloadCondition | undefined> = {
    Failed: conditions?.find(
      ({ type, status, message, reason }) =>
        status === 'True' &&
        (type === 'Failed' || /error|failed/.test(`${message} ${reason}`.toLowerCase())),
    ),
    Succeeded: conditions?.find(
      ({ type, status, message, reason }) =>
        status === 'True' &&
        (type === 'Finished' || /success|succeeded/.test(`${message} ${reason}`.toLowerCase())),
    ),
    Inadmissible: conditions?.find(({ type, status }) => type === 'Admitted' && status === 'False'),
    Pending: conditions?.find(({ type, status }) => type === 'QuotaReserved' && status === 'False'),
    Running: conditions?.find(({ type, status }) => type === 'Admitted' && status === 'True'),
    Unknown: undefined,
  };
  const statusType = (Object.keys(knownStatusConditions) as WorkloadStatusType[]).find(
    (st) => !!knownStatusConditions[st],
  );
  if (!statusType) {
    return {
      status: 'Unknown',
      message: 'Unknown status',
      ...WorkloadStatusColorAndIcon.Unknown,
    };
  }
  return {
    status: statusType,
    message: knownStatusConditions[statusType]?.message || 'No message',
    ...WorkloadStatusColorAndIcon[statusType],
  };
};

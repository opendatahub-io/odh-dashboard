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
  chartColor: string;
  icon: React.ComponentClass<SVGIconProps>;
};

export const WorkloadStatusColorAndIcon: Record<
  WorkloadStatusType,
  Pick<WorkloadStatusInfo, 'color' | 'chartColor' | 'icon'>
> = {
  Inadmissible: {
    color: 'gold',
    chartColor: 'var(--pf-v5-chart-color-gold-300, #F4C145)',
    icon: ExclamationTriangleIcon,
  },
  Pending: {
    color: 'cyan',
    chartColor: 'var(--pf-v5-chart-color-cyan-300, #009596)',
    icon: PendingIcon,
  },
  Running: {
    color: 'blue',
    chartColor: 'var(--pf-v5-chart-color-blue-300, #06C)',
    icon: InProgressIcon,
  },
  Succeeded: {
    color: 'green',
    chartColor: 'var(--pf-v5-chart-color-green-300, #4CB140)',
    icon: CheckCircleIcon,
  },
  Failed: {
    color: 'red',
    chartColor: 'var(--pf-chart-color-red-100, #C9190B)',
    icon: ExclamationCircleIcon,
  },
  Unknown: {
    color: 'grey',
    chartColor: 'var(--pf-chart-color-black-300, #B8BBBE)',
    icon: UnknownIcon,
  },
};

export const getStatusInfo = (wl: WorkloadKind): WorkloadStatusInfo => {
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

export type WorkloadStatusCounts = Record<WorkloadStatusType, number>;

export const getStatusCounts = (workloads: WorkloadKind[]): WorkloadStatusCounts => {
  const statusCounts: WorkloadStatusCounts = {
    Inadmissible: 0,
    Pending: 0,
    Running: 0,
    Succeeded: 0,
    Failed: 0,
    Unknown: 0,
  };
  workloads.forEach((wl) => {
    statusCounts[getStatusInfo(wl).status]++;
  });
  return statusCounts;
};

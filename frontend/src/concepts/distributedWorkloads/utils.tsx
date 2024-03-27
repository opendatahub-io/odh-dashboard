import { LabelProps } from '@patternfly/react-core';
import React from 'react';
import {
  ExclamationTriangleIcon,
  PendingIcon,
  InProgressIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UploadIcon,
  BanIcon,
} from '@patternfly/react-icons';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { WorkloadCondition, WorkloadKind } from '~/k8sTypes';

export enum WorkloadStatusType {
  Pending = 'Pending',
  Inadmissible = 'Inadmissible',
  Admitted = 'Admitted',
  Running = 'Running',
  Evicted = 'Evicted',
  Succeeded = 'Succeeded',
  Failed = 'Failed',
}

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
  Pending: {
    color: 'cyan',
    chartColor: 'var(--pf-v5-chart-color-cyan-300, #009596)',
    icon: PendingIcon,
  },
  Inadmissible: {
    color: 'gold',
    chartColor: 'var(--pf-v5-chart-color-gold-300, #F4C145)',
    icon: ExclamationTriangleIcon,
  },
  Admitted: {
    color: 'purple',
    chartColor: 'var(--pf-v5-chart-color-purple-300, #5752D1)',
    icon: UploadIcon,
  },
  Running: {
    color: 'blue',
    chartColor: 'var(--pf-v5-chart-color-blue-300, #06C)',
    icon: InProgressIcon,
  },
  Evicted: {
    color: 'grey',
    chartColor: 'var(--pf-chart-color-black-300, #B8BBBE)',
    icon: BanIcon,
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
};

export const getStatusInfo = (wl: WorkloadKind): WorkloadStatusInfo => {
  const conditions = wl.status?.conditions;
  // Order matters here: The first matching condition in this order will be used for the current status.
  const statusesInEvalOrder: WorkloadStatusType[] = [
    WorkloadStatusType.Failed,
    WorkloadStatusType.Succeeded,
    WorkloadStatusType.Evicted,
    WorkloadStatusType.Inadmissible,
    WorkloadStatusType.Pending,
    WorkloadStatusType.Running,
    WorkloadStatusType.Admitted,
  ];
  const knownStatusConditions: Record<WorkloadStatusType, WorkloadCondition | undefined> = {
    Failed: conditions?.find(
      ({ type, status, message, reason }) =>
        status === 'True' &&
        type === 'Finished' &&
        /error|failed|rejected/.test(`${message} ${reason}`.toLowerCase()),
    ),
    Succeeded: conditions?.find(
      ({ type, status, message, reason }) =>
        status === 'True' &&
        type === 'Finished' &&
        /success|succeeded/.test(`${message} ${reason}`.toLowerCase()),
    ),
    Evicted: conditions?.find(({ type, status }) => type === 'Evicted' && status === 'True'),
    Inadmissible: conditions?.find(
      ({ type, status, reason }) =>
        type === 'QuotaReserved' && status === 'False' && reason === 'Inadmissible',
    ),
    Pending: conditions?.find(({ type, status }) => type === 'QuotaReserved' && status === 'False'),
    Running: conditions?.find(({ type, status }) => type === 'PodsReady' && status === 'True'),
    Admitted: conditions?.find(({ type, status }) => type === 'Admitted' && status === 'True'),
  };
  const statusType =
    statusesInEvalOrder.find((st) => !!knownStatusConditions[st]) || WorkloadStatusType.Pending;
  return {
    status: statusType,
    message: knownStatusConditions[statusType]?.message || 'No message',
    ...WorkloadStatusColorAndIcon[statusType],
  };
};

export type WorkloadStatusCounts = Record<WorkloadStatusType, number>;

export const getStatusCounts = (workloads: WorkloadKind[]): WorkloadStatusCounts => {
  // Order matters here: The statuses will appear in this order in the status overview chart legend.
  const statusCounts: WorkloadStatusCounts = {
    Pending: 0,
    Inadmissible: 0,
    Admitted: 0,
    Running: 0,
    Evicted: 0,
    Succeeded: 0,
    Failed: 0,
  };
  workloads.forEach((wl) => {
    statusCounts[getStatusInfo(wl).status]++;
  });
  return statusCounts;
};

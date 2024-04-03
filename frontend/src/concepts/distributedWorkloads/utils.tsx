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
import {
  chart_color_cyan_300 as chartColorCyan,
  chart_color_gold_300 as chartColorGold,
  chart_color_purple_300 as chartColorPurple,
  chart_color_blue_300 as chartColorBlue,
  chart_color_black_300 as chartColorBlack,
  chart_color_green_300 as chartColorGreen,
  chart_color_red_100 as chartColorRed,
} from '@patternfly/react-tokens';
import { WorkloadCondition, WorkloadKind } from '~/k8sTypes';
import { ContainerResourceAttributes } from '~/types';
import {
  CPU_UNITS,
  MEMORY_UNITS_FOR_PARSING,
  UnitOption,
  convertToUnit,
} from '~/utilities/valueUnits';

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
    chartColor: chartColorCyan.value,
    icon: PendingIcon,
  },
  Inadmissible: {
    color: 'gold',
    chartColor: chartColorGold.value,
    icon: ExclamationTriangleIcon,
  },
  Admitted: {
    color: 'purple',
    chartColor: chartColorPurple.value,
    icon: UploadIcon,
  },
  Running: {
    color: 'blue',
    chartColor: chartColorBlue.value,
    icon: InProgressIcon,
  },
  Evicted: {
    color: 'grey',
    chartColor: chartColorBlack.value,
    icon: BanIcon,
  },
  Succeeded: {
    color: 'green',
    chartColor: chartColorGreen.value,
    icon: CheckCircleIcon,
  },
  Failed: {
    color: 'red',
    chartColor: chartColorRed.value,
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

export const getWorkloadOwnerJobName = (workload: WorkloadKind): string | undefined =>
  workload.metadata?.ownerReferences?.find((ref) => ref.kind === 'Job')?.name;

export type WorkloadRequestedResources = {
  cpuCoresRequested: number | undefined;
  memoryBytesRequested: number | undefined;
};

export const getWorkloadRequestedResources = (
  workload: WorkloadKind,
): WorkloadRequestedResources => {
  const sumFromPodsets = (units: UnitOption[], attribute: ContainerResourceAttributes) =>
    workload.spec.podSets.reduce((podSetsTotal, podSet) => {
      const requestedPerPod = podSet.template.spec.containers.reduce(
        (containersTotal, container) => {
          const [value, unit] = convertToUnit(
            String(container.resources?.requests?.[attribute] || 0),
            units,
            '',
          );
          return unit.unit === '' ? containersTotal + value : containersTotal;
        },
        0,
      );
      return podSetsTotal + requestedPerPod * podSet.count;
    }, 0);
  return {
    cpuCoresRequested: sumFromPodsets(CPU_UNITS, ContainerResourceAttributes.CPU),
    memoryBytesRequested: sumFromPodsets(
      MEMORY_UNITS_FOR_PARSING,
      ContainerResourceAttributes.MEMORY,
    ),
  };
};

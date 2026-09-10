import * as React from 'react';
import type { LabelProps } from '@patternfly/react-core';
import { CheckIcon, OutlinedClockIcon } from '@patternfly/react-icons';
import { getKueueStatusInfo } from '@odh-dashboard/ui-core/kueue/statusInfo';
import {
  QUOTA_USAGE_TO_KUEUE_STATUS,
  QuotaUsageWorkloadStatuses,
  type QuotaUsageWorkloadStatus,
} from '../types';

export type QuotaUsageWorkloadStatusLabelSettings = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
};

export const getQuotaUsageWorkloadStatusLabelSettings = (
  status: QuotaUsageWorkloadStatus,
): QuotaUsageWorkloadStatusLabelSettings => {
  if (status === QuotaUsageWorkloadStatuses.Pending) {
    return {
      label: status,
      color: 'purple',
      icon: <OutlinedClockIcon />,
    };
  }

  // UXD quota table — grey pill + checkmark (not workbench "Starting" blue spinner).
  if (status === QuotaUsageWorkloadStatuses.Admitted) {
    return {
      label: status,
      color: 'grey',
      icon: <CheckIcon />,
    };
  }

  const kueueStatus = QUOTA_USAGE_TO_KUEUE_STATUS[status];
  if (kueueStatus) {
    const info = getKueueStatusInfo(kueueStatus);
    const Icon = info.IconComponent;
    return {
      label: status,
      color: info.color,
      status: info.status,
      icon: <Icon className={info.iconClassName} />,
    };
  }

  return {
    label: status,
    color: 'grey',
    icon: <OutlinedClockIcon />,
  };
};

import React from 'react';
import { Icon, Tooltip } from '@patternfly/react-core';
import { ExclamationTriangleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import type { StatusReport } from '@odh-dashboard/plugin-core/extension-points';

type Props = {
  status: StatusReport;
  isInline?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export const StatusReportIcon: React.FC<Props> = ({ status, isInline, size }) => {
  const icon =
    status.status === 'warning' ? (
      <Icon status="warning" isInline={isInline} size={size}>
        <ExclamationTriangleIcon />
      </Icon>
    ) : (
      <Icon status="danger" isInline={isInline} size={size}>
        <ExclamationCircleIcon />
      </Icon>
    );

  return status.message ? <Tooltip content={status.message}>{icon}</Tooltip> : icon;
};

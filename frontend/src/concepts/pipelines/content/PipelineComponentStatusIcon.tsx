import * as React from 'react';
import {
  PendingIcon,
  InProgressIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';

export enum StatusType {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

type StatusConfig = {
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  statusColor?: 'success' | 'danger' | 'warning' | 'info';
  className?: string;
};

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  [StatusType.PENDING]: {
    icon: PendingIcon,
  },
  [StatusType.IN_PROGRESS]: {
    icon: InProgressIcon,
    className: 'odh-u-spin',
  },
  [StatusType.SUCCESS]: {
    icon: CheckCircleIcon,
    statusColor: 'success',
  },
  [StatusType.WARNING]: {
    icon: ExclamationTriangleIcon,
    statusColor: 'warning',
  },
  [StatusType.ERROR]: {
    icon: ExclamationCircleIcon,
    statusColor: 'danger',
  },
};

type StatusIconProps = {
  status: StatusType;
};

const PipelineComponentStatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <Icon status={config.statusColor} title={status} aria-label={status}>
      <IconComponent className={config.className} />
    </Icon>
  );
};

export default PipelineComponentStatusIcon;

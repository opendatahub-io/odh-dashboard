import * as React from 'react';
import {
  PendingIcon,
  InProgressIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import {
  t_global_text_color_status_success_default as SuccessColor,
  t_global_text_color_status_warning_default as WarningColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_100 as BlackColor,
} from '@patternfly/react-tokens';

export enum StatusType {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

type StatusConfig = {
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  color: string;
  className?: string;
};

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  [StatusType.PENDING]: {
    icon: PendingIcon,
    color: BlackColor.var,
  },
  [StatusType.IN_PROGRESS]: {
    icon: InProgressIcon,
    color: BlackColor.var,
    className: 'odh-u-spin',
  },
  [StatusType.SUCCESS]: {
    icon: CheckCircleIcon,
    color: SuccessColor.var,
  },
  [StatusType.WARNING]: {
    icon: ExclamationTriangleIcon,
    color: WarningColor.var,
  },
  [StatusType.ERROR]: {
    icon: ExclamationCircleIcon,
    color: DangerColor.var,
  },
};

type StatusIconProps = {
  status: StatusType;
  className?: string;
};

const K8sStatusIcon: React.FC<StatusIconProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center' }}
      title={status}
    >
      <IconComponent style={{ color: config.color }} className={config.className} />
    </span>
  );
};

export default K8sStatusIcon;

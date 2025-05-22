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

export type StatusType = 'pending' | 'in-progress' | 'success' | 'warning' | 'error';

type StatusIconProps = {
  status: StatusType;
  className?: string;
};

const K8sStatusIcon: React.FC<StatusIconProps> = ({ status, className }) => {
  const getIcon = () => {
    switch (status) {
      case 'pending':
        return <PendingIcon style={{ color: BlackColor.var }} />;
      case 'in-progress':
        return <InProgressIcon style={{ color: BlackColor.var }} className="odh-u-spin" />;
      case 'success':
        return <CheckCircleIcon style={{ color: SuccessColor.var }} />;
      case 'warning':
        return <ExclamationTriangleIcon style={{ color: WarningColor.var }} />;
      case 'error':
        return <ExclamationCircleIcon style={{ color: DangerColor.var }} />;
      default:
        return <PendingIcon style={{ color: BlackColor.var }} />;
    }
  };

  const statusTitle = status ?? 'pending';
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center' }}
      title={statusTitle}
    >
      {getIcon()}
    </span>
  );
};

export default K8sStatusIcon;

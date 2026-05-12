import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
} from '@patternfly/react-icons';
import { EventStatus, NotebookStatus } from '#~/types';
import { getKueueStatusInfo } from '#~/concepts/kueue';
import {
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
  type KueueWorkloadStatusWithMessage,
} from '#~/concepts/kueue/types';

type NotebookStateStatusProps = {
  isStarting: boolean;
  isStopping: boolean;
  isRunning: boolean;
  notebookStatus?: NotebookStatus | null;
  kueueStatus?: KueueWorkloadStatusWithMessage | null;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
};

type StatusLabelSettings = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
};

const NotebookStatusLabel: React.FC<NotebookStateStatusProps> = ({
  isStarting,
  isStopping,
  isRunning,
  notebookStatus,
  kueueStatus = null,
  isCompact,
  onClick,
}) => {
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;

  const labelSettings = React.useMemo<StatusLabelSettings>(() => {
    if (isError) {
      return {
        label: 'Failed',
        status: 'danger',
        icon: <ExclamationCircleIcon />,
      };
    }

    if (isStopping) {
      return {
        label: 'Stopping',
        color: 'grey',
        icon: <InProgressIcon className="ai-u-spin" />,
      };
    }
    if (kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status)) {
      const info = getKueueStatusInfo(kueueStatus.status);
      return {
        label: info.label,
        color: info.color,
        status: info.status,
        icon: <info.IconComponent className={info.iconClassName} />,
      };
    }
    if (isStarting) {
      return {
        label: 'Starting',
        color: 'blue',
        icon: <InProgressIcon className="ai-u-spin" />,
      };
    }
    if (isRunning) {
      return {
        label: 'Ready',
        status: 'success',
        icon: <CheckCircleIcon />,
      };
    }
    return {
      label: 'Stopped',
      color: 'grey',
      icon: <OffIcon />,
    };
  }, [kueueStatus, isError, isRunning, isStarting, isStopping]);

  return (
    <Label
      variant={onClick ? 'filled' : 'outline'}
      isCompact={isCompact}
      color={labelSettings.color}
      status={labelSettings.status}
      icon={labelSettings.icon}
      data-testid="notebook-status-text"
      style={{ width: 'fit-content' }}
      onClick={onClick}
    >
      {labelSettings.label}
    </Label>
  );
};

export default NotebookStatusLabel;

import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  PlayIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { EventStatus, NotebookStatus } from '#~/types';

type NotebookStateStatusProps = {
  isStarting: boolean;
  isStopping: boolean;
  isRunning: boolean;
  notebookStatus?: NotebookStatus | null;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
};

const NotebookStatusLabel: React.FC<NotebookStateStatusProps> = ({
  isStarting,
  isStopping,
  isRunning,
  notebookStatus,
  isCompact,
  onClick,
}) => {
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;

  const statusLabelSettings = React.useMemo((): {
    label: string;
    color?: LabelProps['color'];
    status?: LabelProps['status'];
    icon: React.ReactNode;
  } => {
    if (isError) {
      return { label: 'Failed', status: 'danger', icon: <ExclamationCircleIcon /> };
    }
    if (isStarting) {
      return {
        label: 'Starting',
        color: 'blue',
        icon: <InProgressIcon className="odh-u-spin" />,
      };
    }
    if (isStopping) {
      return {
        label: 'Stopping',
        color: 'grey',
        icon: <SyncAltIcon className="odh-u-spin" />,
      };
    }
    if (isRunning) {
      return { label: 'Running', status: 'success', icon: <PlayIcon /> };
    }
    return { label: 'Stopped', color: 'grey', icon: <OffIcon /> };
  }, [isError, isRunning, isStarting, isStopping]);

  return (
    <Label
      isCompact={isCompact}
      color={statusLabelSettings.color}
      status={statusLabelSettings.status}
      icon={statusLabelSettings.icon}
      data-testid="notebook-status-text"
      style={{ width: 'fit-content' }}
      onClick={onClick}
    >
      {statusLabelSettings.label}
    </Label>
  );
};

export default NotebookStatusLabel;

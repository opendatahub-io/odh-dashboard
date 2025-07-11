import React from 'react';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  OutlinedQuestionCircleIcon,
  PlayIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';

type ModelStatusIconProps = {
  state: InferenceServiceModelState;
  defaultHeaderContent?: string;
  bodyContent?: string;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
  isStarting?: boolean;
  isStopping?: boolean;
  isStopped?: boolean;
};

export const ModelStatusIcon: React.FC<ModelStatusIconProps> = ({
  state,
  defaultHeaderContent = 'Status',
  bodyContent = '',
  isCompact,
  onClick,
  isStarting,
  isStopping,
  isStopped,
}) => {
  const statusSettings = React.useMemo((): {
    label: string;
    color?: LabelProps['color'];
    status?: LabelProps['status'];
    icon: React.ReactNode;
    message?: string;
  } => {
    // Highest-priority: service explicitly stopped
    if (isStopped) {
      return {
        label: 'Stopped',
        color: 'grey',
        icon: <OffIcon />,
        message: 'Offline and not using resources. Restart to use model.',
      };
    }

    if (isStopping) {
      return {
        label: 'Stopping',
        color: 'grey',
        icon: <SyncAltIcon className="odh-u-spin" />,
      };
    }
    // Show 'Starting' for optimistic updates or for loading/pending states from the backend.
    if (
      isStarting ||
      state === InferenceServiceModelState.LOADING ||
      state === InferenceServiceModelState.PENDING
    ) {
      return {
        label: 'Starting',
        color: 'blue',
        icon: <InProgressIcon className="odh-u-spin" />,
      };
    }

    // Only check the state if not stopped
    switch (state) {
      case InferenceServiceModelState.LOADED:
      case InferenceServiceModelState.STANDBY:
        return {
          label: 'Started',
          status: 'success',
          icon: <PlayIcon />,
          message: 'Model is deployed.',
        };
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return {
          label: 'Failed',
          status: 'danger',
          icon: <ExclamationCircleIcon />,
        };
      case InferenceServiceModelState.UNKNOWN:
        return {
          label: defaultHeaderContent || 'Status',
          color: 'grey',
          icon: <OutlinedQuestionCircleIcon />,
        };
    }
  }, [state, defaultHeaderContent, isStarting, isStopping, isStopped]);

  return (
    <Popover
      data-testid="model-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={statusSettings.label}
      bodyContent={statusSettings.message || bodyContent}
      isVisible={bodyContent ? undefined : false}
    >
      <Label
        isCompact={isCompact}
        color={statusSettings.color}
        status={statusSettings.status}
        icon={statusSettings.icon}
        data-testid="model-status-text"
        style={{ width: 'fit-content', cursor: 'pointer' }}
        onClick={onClick}
      >
        {statusSettings.label}
      </Label>
    </Popover>
  );
};

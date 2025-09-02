import React from 'react';
import { Icon, Label, LabelProps, Popover } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  OutlinedQuestionCircleIcon,
  PlayIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { ModelDeploymentState } from '#~/pages/modelServing/screens/types';
import { ToggleState } from '#~/components/StateActionToggle';

type ModelStatusIconProps = {
  state: ModelDeploymentState;
  defaultHeaderContent?: string;
  bodyContent?: string;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
  stoppedStates?: ToggleState;
  hideLabel?: boolean;
};

export const ModelStatusIcon: React.FC<ModelStatusIconProps> = ({
  state,
  defaultHeaderContent = 'Status',
  bodyContent = '',
  isCompact,
  onClick,
  stoppedStates,
  hideLabel,
}) => {
  const statusSettings = React.useMemo((): {
    label: string;
    color?: LabelProps['color'];
    status?: LabelProps['status'];
    icon: React.ReactNode;
    message?: string;
  } => {
    // Highest-priority: service explicitly stopped
    if (stoppedStates?.isStopped) {
      return {
        label: 'Stopped',
        color: 'grey',
        icon: <OffIcon />,
        message: 'Offline and not using resources. To use the model, restart it.',
      };
    }

    if (stoppedStates?.isStopping) {
      return {
        label: 'Stopping',
        color: 'grey',
        icon: <SyncAltIcon className="odh-u-spin" />,
        message: 'Model deployment is stopping.',
      };
    }
    // Show 'Starting' for optimistic updates or for loading/pending states from the backend.
    if (
      stoppedStates?.isStarting ||
      state === ModelDeploymentState.LOADING ||
      state === ModelDeploymentState.PENDING
    ) {
      return {
        label: 'Starting',
        color: 'blue',
        icon: <InProgressIcon className="odh-u-spin" />,
        message: 'Model deployment is starting.',
      };
    }

    // Only check the state if not stopped
    switch (state) {
      case ModelDeploymentState.LOADED:
      case ModelDeploymentState.STANDBY:
        return {
          label: 'Started',
          status: 'success',
          icon: <PlayIcon />,
          message: 'Model deployment is active.',
        };
      case ModelDeploymentState.FAILED_TO_LOAD:
        return {
          label: 'Failed',
          status: 'danger',
          icon: <ExclamationCircleIcon />,
        };
      case ModelDeploymentState.UNKNOWN:
        return {
          label: defaultHeaderContent || 'Status',
          color: 'grey',
          icon: <OutlinedQuestionCircleIcon />,
        };
    }
  }, [state, defaultHeaderContent, stoppedStates]);

  return (
    <Popover
      data-testid="model-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={statusSettings.label}
      bodyContent={statusSettings.message || bodyContent}
      isVisible={bodyContent ? undefined : false}
    >
      {hideLabel ? (
        <Icon
          style={{ cursor: 'pointer' }}
          status={statusSettings.status}
          color={statusSettings.color}
          children={statusSettings.icon}
        />
      ) : (
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
      )}
    </Popover>
  );
};

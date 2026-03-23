import React from 'react';
import { Icon, Label, LabelProps, Popover } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { ModelDeploymentState } from '#~/pages/modelServing/screens/types';
import { ToggleState } from '#~/components/StateActionToggle';

type ModelStatusIconProps = {
  state: ModelDeploymentState;
  bodyContent?: string;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
  stoppedStates?: ToggleState;
  hideLabel?: boolean;
};

export const ModelStatusIcon: React.FC<ModelStatusIconProps> = ({
  state,
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
        message:
          'The model deployment is intentionally inactive and is not using any compute resources (scaled to zero pods). It is not serving requests, but its configuration is preserved. A "Starting" process is required to make it "Ready" again.',
      };
    }

    if (stoppedStates?.isStopping) {
      return {
        label: 'Stopping',
        color: 'grey',
        icon: <InProgressIcon className="odh-u-spin" />,
        message:
          'The system is in the process of shutting down the model deployment. This can be triggered by a user request to stop the model, an update to the deployment, or an automated scale-down-to-zero process to conserve resources when the model is not in use.',
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
        message:
          "The system is in the process of deploying the model. This state includes all the startup tasks, such as provisioning resources (like pods), pulling the model's container image, loading the model into memory, and running initial health checks.",
      };
    }

    // Only check the state if not stopped
    switch (state) {
      case ModelDeploymentState.LOADED:
      case ModelDeploymentState.STANDBY:
        return {
          label: 'Ready',
          status: 'success',
          icon: <CheckCircleIcon />,
          message:
            'The model deployment is fully operational and healthy. It has successfully started, passed all its health checks, and is actively able to receive and respond to inference requests.',
        };
      case ModelDeploymentState.FAILED_TO_LOAD:
        return {
          label: 'Failed',
          status: 'danger',
          icon: <ExclamationCircleIcon />,
          message:
            "The deployment encountered a critical error and cannot run. This could be due to various reasons, such as a missing model file, an error in the model's code, insufficient resources (like memory or GPU), or a persistent container crash (CrashLoopBackOff). The deployment will not serve requests until the underlying issue is fixed.",
        };
      case ModelDeploymentState.UNKNOWN:
        return {
          label: 'Unknown',
          color: 'grey',
          icon: <OutlinedQuestionCircleIcon />,
          message:
            "The system cannot determine the current state of the model deployment. This often occurs when the controlling components lose communication with the model's pods or during the initial moments of startup before a 'Starting' or 'Ready' status can be established. It can also indicate an underlying problem with the cluster or networking.",
        };
    }
  }, [state, stoppedStates]);

  const resolvedBodyContent = bodyContent.trim() || statusSettings.message;

  return (
    <Popover
      data-testid="model-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={statusSettings.label}
      bodyContent={resolvedBodyContent}
      isVisible={resolvedBodyContent ? undefined : false}
    >
      {hideLabel ? (
        <Icon
          style={{ cursor: 'pointer' }}
          status={statusSettings.status}
          aria-label={statusSettings.label}
          color={statusSettings.color}
          onClick={onClick}
        >
          {statusSettings.icon}
        </Icon>
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

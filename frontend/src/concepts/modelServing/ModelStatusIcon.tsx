import React from 'react';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  OutlinedQuestionCircleIcon,
  PlayIcon,
} from '@patternfly/react-icons';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import { InferenceServiceKind } from '#~/k8sTypes';

type ModelStatusIconProps = {
  state: InferenceServiceModelState;
  defaultHeaderContent?: string;
  bodyContent?: string;
  isCompact?: boolean;
  onClick?: LabelProps['onClick'];
  inferenceService?: InferenceServiceKind;
  isStarting?: boolean;
};

export const ModelStatusIcon: React.FC<ModelStatusIconProps> = ({
  state,
  defaultHeaderContent = 'Status',
  bodyContent = '',
  isCompact,
  onClick,
  inferenceService,
  isStarting,
}) => {
  const statusSettings = React.useMemo((): {
    label: string;
    color?: LabelProps['color'];
    status?: LabelProps['status'];
    icon: React.ReactNode;
  } => {
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

    // Check if the service is stopped via annotation
    const isStopped = inferenceService?.metadata.annotations?.['serving.kserve.io/stop'] === 'true';
    if (!isStopped) {
      // Only check the state if not stopped
      switch (state) {
        case InferenceServiceModelState.LOADED:
        case InferenceServiceModelState.STANDBY:
          return {
            label: 'Running',
            status: 'success',
            icon: <PlayIcon />,
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
    }
    // If stopped, show stopped state
    return { label: 'Stopped', color: 'grey', icon: <OffIcon /> };
  }, [state, defaultHeaderContent, inferenceService, isStarting]);

  return (
    <Popover
      data-testid="model-status-tooltip"
      className="odh-u-scrollable"
      position="top"
      headerContent={statusSettings.label}
      bodyContent={bodyContent}
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

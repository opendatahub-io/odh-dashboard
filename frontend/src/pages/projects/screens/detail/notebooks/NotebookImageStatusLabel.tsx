import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import {
  NotebookImageAvailability,
  NotebookImageStatus,
} from '#~/pages/projects/screens/detail/notebooks/const';

type NotebookImageStatusLabelProps = {
  imageStatus: NotebookImageStatus;
  imageAvailability?: NotebookImageAvailability;
};

const NotebookImageStatusLabel: React.FC<NotebookImageStatusLabelProps> = ({
  imageStatus,
  imageAvailability,
}) => {
  const getColor = (): LabelProps['color'] => {
    // DISABLED availability takes priority
    if (imageAvailability === NotebookImageAvailability.DISABLED) {
      return 'yellow';
    }

    switch (imageStatus) {
      case NotebookImageStatus.DELETED:
        return 'red';
      case NotebookImageStatus.DEPRECATED:
        return 'yellow';
      case NotebookImageStatus.LATEST:
        return 'green';
      default:
        return 'grey';
    }
  };

  const getIcon = (): LabelProps['icon'] => {
    // DISABLED availability takes priority
    if (imageAvailability === NotebookImageAvailability.DISABLED) {
      return <ExclamationTriangleIcon />;
    }

    switch (imageStatus) {
      case NotebookImageStatus.DELETED:
        return <ExclamationCircleIcon />;
      case NotebookImageStatus.DEPRECATED:
        return <ExclamationTriangleIcon />;
      case NotebookImageStatus.LATEST:
        return <CheckCircleIcon />;
      default:
        return <InfoCircleIcon />;
    }
  };

  const getLabelText = (): string => {
    // When image availability is DISABLED, show that instead of the status
    if (imageAvailability === NotebookImageAvailability.DISABLED) {
      return NotebookImageAvailability.DISABLED;
    }
    return imageStatus;
  };

  return (
    <Label data-testid="notebook-image-status-label" isCompact color={getColor()} icon={getIcon()}>
      {getLabelText()}
    </Label>
  );
};

export default NotebookImageStatusLabel;

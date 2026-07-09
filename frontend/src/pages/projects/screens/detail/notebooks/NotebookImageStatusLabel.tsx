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
    switch (imageStatus) {
      case NotebookImageStatus.DELETED:
        return 'red';
      case NotebookImageStatus.DEPRECATED:
        return 'yellow';
      case NotebookImageStatus.LATEST:
        return 'green';
      default:
        break;
    }
    // DISABLED availability overrides to yellow
    if (imageAvailability === NotebookImageAvailability.DISABLED) {
      return 'yellow';
    }
    return 'grey';
  };

  const getIcon = (): LabelProps['icon'] => {
    switch (imageStatus) {
      case NotebookImageStatus.DELETED:
        return <ExclamationCircleIcon />;
      case NotebookImageStatus.DEPRECATED:
        return <ExclamationTriangleIcon />;
      case NotebookImageStatus.LATEST:
        return <CheckCircleIcon />;
      default:
        break;
    }
    // DISABLED availability overrides to warning icon
    if (imageAvailability === NotebookImageAvailability.DISABLED) {
      return <ExclamationTriangleIcon />;
    }
    return <InfoCircleIcon />;
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

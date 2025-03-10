import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon } from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';
import { PipelineResourceRestoreResult } from './types';

type StatusIconProps = {
  status: PipelineResourceRestoreResult | undefined;
  isSubmitting: boolean;
};

export const RestoreRunsStatusIcon: React.FC<StatusIconProps> = ({ status, isSubmitting }) => {
  if (!isSubmitting && !status) {
    return null;
  }
  if (status === undefined) {
    return <PendingIcon />;
  }
  if (status === true) {
    return (
      <Icon status="success">
        <CheckCircleIcon />
      </Icon>
    );
  }
  if (status instanceof Error) {
    return (
      <Icon status="danger">
        <ExclamationCircleIcon />
      </Icon>
    );
  }
  return null;
};

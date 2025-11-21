import React from 'react';
import { Label, Skeleton } from '@patternfly/react-core';
import { getTrainingJobStatusSync, getStatusInfo } from '../utils';
import { TrainJobKind } from '../../../k8sTypes';
import { TrainingJobState } from '../../../types';

type TrainingJobStatusProps = {
  job: TrainJobKind;
  jobStatus?: TrainingJobState;
  onClick?: () => void;
  isCompact?: boolean;
};

const TrainingJobStatus = ({
  job,
  jobStatus,
  onClick,
  isCompact = true,
}: TrainingJobStatusProps): React.ReactElement => {
  const status = jobStatus || getTrainingJobStatusSync(job);
  const isLoadingStatus = jobStatus === undefined;

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Label
      isCompact={isCompact}
      status={statusInfo.status}
      color={statusInfo.color}
      icon={<statusInfo.IconComponent />}
      data-testid="training-job-status"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {statusInfo.label}
    </Label>
  );
};

export default TrainingJobStatus;

import React from 'react';
import { Flex, FlexItem, Label, Progress, Skeleton } from '@patternfly/react-core';
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
  const trainerStatus = job.status?.trainerStatus;
  const progressPercentage = trainerStatus?.progressPercentage;

  // Show progress bar for running jobs that have progress information
  const showProgress =
    status === TrainingJobState.RUNNING &&
    progressPercentage != null &&
    progressPercentage >= 0 &&
    progressPercentage <= 100;

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
      <FlexItem>
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
      </FlexItem>
      {showProgress && (
        <FlexItem>
          <Progress
            value={progressPercentage}
            size="sm"
            style={{ width: '200px' }}
            aria-label={`Training progress: ${progressPercentage}%`}
            data-testid="training-job-progress-bar"
          />
        </FlexItem>
      )}
    </Flex>
  );
};

export default TrainingJobStatus;

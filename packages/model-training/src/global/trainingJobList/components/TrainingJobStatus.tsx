import React from 'react';
import { Flex, FlexItem, Label, Progress, Skeleton } from '@patternfly/react-core';
import { getTrainingJobStatusSync, getStatusInfo } from '../utils';
import { PyTorchJobKind } from '../../../k8sTypes';
import { PyTorchJobState } from '../../../types';

const TrainingJobStatus = ({
  job,
  jobStatus,
}: {
  job: PyTorchJobKind;
  jobStatus?: PyTorchJobState;
}): React.ReactElement => {
  const status = jobStatus || getTrainingJobStatusSync(job);
  const isLoadingStatus = jobStatus === undefined;
  const isRunning = status === PyTorchJobState.RUNNING;

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
      <FlexItem>
        <Label
          isCompact
          status={statusInfo.status}
          color={statusInfo.color}
          icon={<statusInfo.IconComponent />}
          data-testid="training-job-status"
        >
          {statusInfo.label}
        </Label>
      </FlexItem>
      {/* Only show progress bar if job is running and completion percentage is available */}
      {isRunning && job.status?.completionPercentage ? (
        <FlexItem>
          <Progress value={job.status.completionPercentage} style={{ width: '200px' }} size="sm" />
        </FlexItem>
      ) : null}
    </Flex>
  );
};

export default TrainingJobStatus;

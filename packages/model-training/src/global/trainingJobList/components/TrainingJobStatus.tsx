import React from 'react';
import { Flex, FlexItem, Label, Skeleton } from '@patternfly/react-core';
import { getTrainingJobStatusSync, getStatusInfo } from '../utils';
import { TrainJobKind } from '../../../k8sTypes';
import { TrainingJobState } from '../../../types';

const TrainingJobStatus = ({
  job,
  jobStatus,
}: {
  job: TrainJobKind;
  jobStatus?: TrainingJobState;
}): React.ReactElement => {
  const status = jobStatus || getTrainingJobStatusSync(job);
  const isLoadingStatus = jobStatus === undefined;

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
      {/* Progress tracking is not directly available in TrainJob status */}
      {/* TODO: Consider adding progress tracking if supported by TrainJob runtime */}
    </Flex>
  );
};

export default TrainingJobStatus;

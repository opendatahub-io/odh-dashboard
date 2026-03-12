import React from 'react';
import { Label, Skeleton } from '@patternfly/react-core';
import { getRayJobStatusSync, getStatusInfo } from '../utils';
import { RayJobKind } from '../../../k8sTypes';
import { JobDisplayState } from '../../../types';

type RayJobStatusProps = {
  job: RayJobKind;
  jobStatus?: JobDisplayState;
  onClick?: () => void;
};

const RayJobStatus = ({ job, jobStatus, onClick }: RayJobStatusProps): React.ReactElement => {
  const status = jobStatus || getRayJobStatusSync(job);
  const isLoadingStatus = jobStatus === undefined;

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Label
      isCompact
      status={statusInfo.status}
      color={statusInfo.color}
      icon={<statusInfo.IconComponent />}
      data-testid="training-job-status"
      onClick={onClick}
      style={onClick !== undefined ? { cursor: 'pointer' } : undefined}
    >
      {statusInfo.label}
    </Label>
  );
};

export default RayJobStatus;

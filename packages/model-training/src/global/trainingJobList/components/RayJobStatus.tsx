import React from 'react';
import { Label, Skeleton } from '@patternfly/react-core';
import { getRayJobStatusSync, getStatusInfo } from '../utils';
import { RayJobKind } from '../../../k8sTypes';
import { JobDisplayState } from '../../../types';

type RayJobStatusProps = {
  job: RayJobKind;
  jobStatus?: JobDisplayState;
  isLoading?: boolean;
  onClick?: () => void;
};

const RayJobStatus = ({
  job,
  jobStatus,
  isLoading = false,
  onClick,
}: RayJobStatusProps): React.ReactElement => {
  const status = jobStatus ?? getRayJobStatusSync(job);
  const isLoadingStatus = isLoading && jobStatus === undefined;

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" data-testid="ray-job-status-loading" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Label
      isCompact
      status={statusInfo.status}
      color={statusInfo.color}
      icon={<statusInfo.IconComponent />}
      data-testid="ray-job-status"
      onClick={onClick}
      style={onClick !== undefined ? { cursor: 'pointer' } : undefined}
    >
      {statusInfo.label}
    </Label>
  );
};

export default RayJobStatus;

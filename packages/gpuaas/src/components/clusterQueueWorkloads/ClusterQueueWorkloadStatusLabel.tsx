import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { getQuotaUsageWorkloadStatusLabelSettings } from '../../utils/clusterQueueWorkloadStatusLabelUtils';
import type { QuotaUsageWorkloadStatus } from '../../types';
import './ClusterQueueWorkloadStatusLabel.scss';

type ClusterQueueWorkloadStatusLabelProps = {
  status: QuotaUsageWorkloadStatus;
};

/** Non-interactive status badge for the Quota usage workloads table. */
const ClusterQueueWorkloadStatusLabel: React.FC<ClusterQueueWorkloadStatusLabelProps> = ({
  status,
}) => {
  const labelSettings = getQuotaUsageWorkloadStatusLabelSettings(status);

  return (
    <Label
      className="gpuaas-cluster-queue-workload-status-label"
      variant="filled"
      isCompact
      color={labelSettings.color}
      status={labelSettings.status}
      icon={labelSettings.icon}
      data-testid="cluster-queue-workload-status-label"
    >
      {labelSettings.label}
    </Label>
  );
};

export default ClusterQueueWorkloadStatusLabel;

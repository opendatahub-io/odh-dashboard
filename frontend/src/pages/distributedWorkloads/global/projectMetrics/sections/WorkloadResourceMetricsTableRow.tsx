import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { WorkloadKind } from '#~/k8sTypes';
import {
  WorkloadRequestedResources,
  WorkloadStatusType,
  getStatusInfo,
  getWorkloadName,
} from '#~/concepts/distributedWorkloads/utils';
import { WorkloadResourceUsageBar } from '#~/pages/distributedWorkloads/components/WorkloadResourceUsageBar';
import { WorkloadStatusLabel } from '#~/pages/distributedWorkloads/components/WorkloadStatusLabel';
import { bytesAsPreciseGiB } from '#~/utilities/number';
import { WorkloadCurrentUsage } from '#~/api';

type WorkloadResourceMetricsTableRowProps = {
  workload: WorkloadKind;
  usage: WorkloadCurrentUsage;
  requested: WorkloadRequestedResources;
};
const WorkloadResourceMetricsTableRow: React.FC<WorkloadResourceMetricsTableRowProps> = ({
  workload,
  usage,
  requested,
}) => {
  const inActiveState = [
    WorkloadStatusType.Pending,
    WorkloadStatusType.Admitted,
    WorkloadStatusType.Running,
  ].includes(getStatusInfo(workload).status);
  return (
    <Tr key={workload.metadata?.uid}>
      <Td dataLabel="Name">{getWorkloadName(workload)}</Td>
      <Td dataLabel="CPU usage (cores)" style={{ paddingRight: 'var(--pf-t--global--spacer--xl)' }}>
        {' '}
        <WorkloadResourceUsageBar
          showData={inActiveState || (usage.cpuCoresUsed || 0) > 0}
          used={usage.cpuCoresUsed}
          requested={requested.cpuCoresRequested}
          metricLabel="CPU"
          unitLabel="cores"
          progressBarAriaLabel="CPU usage/requested"
        />
      </Td>
      <Td
        dataLabel="Memory usage (GiB)"
        style={{ paddingRight: 'var(--pf-t--global--spacer--xl)' }}
      >
        {' '}
        <WorkloadResourceUsageBar
          showData={inActiveState || (usage.memoryBytesUsed || 0) > 0}
          used={bytesAsPreciseGiB(usage.memoryBytesUsed)}
          requested={bytesAsPreciseGiB(requested.memoryBytesRequested)}
          metricLabel="Memory"
          unitLabel="GiB"
          progressBarAriaLabel="Memory usage/requested"
        />
      </Td>
      <Td dataLabel="Status">
        <WorkloadStatusLabel workload={workload} />
      </Td>
    </Tr>
  );
};

export default WorkloadResourceMetricsTableRow;

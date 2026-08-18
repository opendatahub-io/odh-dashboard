import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { relativeTime } from '../utilities/time';

type ResourceWithConditions = K8sResourceCommon & {
  status?: {
    conditions?: Array<{
      type?: string;
      status?: string;
      lastTransitionTime?: string;
    }>;
  };
};

type LastDeployedProps = {
  resource: ResourceWithConditions;
};

export const LastDeployed: React.FC<LastDeployedProps> = ({ resource }) => {
  const conditions = Array.isArray(resource.status?.conditions) ? resource.status.conditions : [];
  const readyCondition = conditions.find(
    (condition) => condition.type === 'Ready' && condition.status === 'True',
  );

  if (!readyCondition?.lastTransitionTime) {
    return <>-</>;
  }

  const transitionTimestamp = readyCondition.lastTransitionTime;

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Timestamp
        data-testid="last-deployed-timestamp"
        date={new Date(transitionTimestamp)}
        tooltip={{
          variant: TimestampTooltipVariant.default,
        }}
      >
        {relativeTime(Date.now(), new Date(transitionTimestamp).getTime())}
      </Timestamp>
    </span>
  );
};

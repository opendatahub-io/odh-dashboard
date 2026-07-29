import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { relativeTime } from '../utilities/time';

type LastDeployedProps = {
  resource: K8sResourceCommon;
};

export const LastDeployed: React.FC<LastDeployedProps> = ({ resource }) => {
  const conditions = Array.isArray(resource.status?.conditions)
    ? resource.status.conditions.filter(
        (c): c is NonNullable<typeof c> => c != null && typeof c === 'object',
      )
    : [];
  const readyCondition =
    conditions.find((c) => c.type === 'Ready' && c.status === 'True') ??
    conditions.find((c) => c.type === 'Ready');

  const transitionTimestamp = readyCondition?.lastTransitionTime;

  if (!readyCondition || typeof transitionTimestamp !== 'string') {
    return <>-</>;
  }

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

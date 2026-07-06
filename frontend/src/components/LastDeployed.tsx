import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { relativeTime } from '#~/utilities/time';

type LastDeployedProps = {
  resource: K8sResourceCommon;
};

export const LastDeployed: React.FC<LastDeployedProps> = ({ resource }) => {
  const conditions = Array.isArray(resource.status?.conditions) ? resource.status.conditions : [];
  const readyCondition = conditions.find((c) => c.type === 'Ready' && c.status === 'True');

  if (!readyCondition) {
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
